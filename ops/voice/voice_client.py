#!/usr/bin/env python3
"""
FlashRouter Voice Client — full conversational voice loop with Grok.

Flow:
    1. You hold SPACE to talk
    2. Mic audio captured to a buffer
    3. Whisper (local, free) transcribes
    4. Transcript sent to Grok with the FlashRouter Operator system prompt
       and the same tool registry as the server agent
    5. Grok's response streamed to ElevenLabs TTS
    6. Audio played through your default output

Environment:
    XAI_API_KEY           xAI API key (required)
    ELEVENLABS_API_KEY    ElevenLabs key (required; or set USE_LOCAL_TTS=true)
    ELEVENLABS_VOICE_ID   voice to use (default: a calm operator voice)
    WHISPER_MODEL         tiny | base | small | medium (default: base)
    USE_LOCAL_TTS         use pyttsx3 instead of ElevenLabs (free, lower quality)

Hotkeys:
    SPACE (hold)    push-to-talk
    Q               quit
    M               mute the response
    R               replay last response

Run:
    python voice_client.py
"""

from __future__ import annotations

import os
import sys
import threading
import time
import wave
from pathlib import Path
from queue import Queue
from typing import Any

# Lazy imports inside main() so the file parses on systems without all deps
# (we want `python voice_client.py --help` to work even without sounddevice)

REPO_ROOT = Path(__file__).parent.parent.parent.resolve()
PROMPT_PATH = REPO_ROOT / "ops" / "prompts" / "flashrouter-operator.md"


def load_system_prompt() -> str:
    base = PROMPT_PATH.read_text()
    return base + "\n\n## RUNTIME CONTEXT\n\n- Mode: voice (conversational)\n- Tier: 2 (PR power, you supervise)\n- Speak responses naturally; no markdown, no bullet characters.\n"


# ─────────────────────────────────────────────────────────────────────────
#                              AUDIO CAPTURE
# ─────────────────────────────────────────────────────────────────────────

SAMPLE_RATE = 16_000  # Whisper expects 16kHz mono
CHANNELS = 1


class MicRecorder:
    """Push-to-talk mic capture using sounddevice."""

    def __init__(self) -> None:
        import sounddevice as sd  # noqa: F401  (deferred dep check)
        import numpy as np  # noqa: F401

        self.recording = False
        self.frames: list[Any] = []
        self._stream = None

    def start(self) -> None:
        import sounddevice as sd
        import numpy as np

        self.frames = []
        self.recording = True

        def callback(indata, frames_count, time_info, status):  # noqa: ARG001
            if self.recording:
                self.frames.append(indata.copy())

        self._stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
            callback=callback,
        )
        self._stream.start()

    def stop(self) -> bytes:
        import numpy as np

        self.recording = False
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        if not self.frames:
            return b""
        data = np.concatenate(self.frames, axis=0)
        # Convert float32 [-1, 1] to int16 PCM
        pcm = (data * 32767).astype("int16").tobytes()
        return pcm


def save_wav(pcm: bytes, path: Path) -> None:
    with wave.open(str(path), "wb") as f:
        f.setnchannels(CHANNELS)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(pcm)


# ─────────────────────────────────────────────────────────────────────────
#                              WHISPER (LOCAL STT)
# ─────────────────────────────────────────────────────────────────────────


class WhisperTranscriber:
    """Local Whisper via faster-whisper. Loads model once, reuses."""

    def __init__(self, model_name: str = "base") -> None:
        from faster_whisper import WhisperModel

        device = "cuda" if _cuda_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        print(f"[whisper] loading {model_name} on {device} ({compute_type})...")
        self.model = WhisperModel(model_name, device=device, compute_type=compute_type)

    def transcribe(self, wav_path: Path) -> str:
        segments, _ = self.model.transcribe(str(wav_path), language="en")
        return " ".join(s.text.strip() for s in segments)


def _cuda_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except ImportError:
        return False


# ─────────────────────────────────────────────────────────────────────────
#                              GROK CHAT
# ─────────────────────────────────────────────────────────────────────────


class GrokVoiceAgent:
    """Maintains conversation history with Grok across turns."""

    def __init__(self) -> None:
        import httpx

        key = os.environ.get("XAI_API_KEY")
        if not key:
            raise RuntimeError("XAI_API_KEY not set. Set it in your environment first.")
        self.client = httpx.Client(
            base_url="https://api.x.ai/v1",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=120,
        )
        self.model = os.environ.get("GROK_MODEL", "grok-4-latest")
        self.history: list[dict[str, Any]] = [
            {"role": "system", "content": load_system_prompt()}
        ]

    def ask(self, user_text: str) -> str:
        self.history.append({"role": "user", "content": user_text})
        # Cap history to last 20 turns to keep tokens bounded
        if len(self.history) > 41:  # 1 system + 20 user + 20 assistant
            self.history = [self.history[0]] + self.history[-40:]

        resp = self.client.post(
            "/chat/completions",
            json={
                "model": self.model,
                "messages": self.history,
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
        self.history.append({"role": "assistant", "content": reply})
        return reply


# ─────────────────────────────────────────────────────────────────────────
#                              TTS OUTPUT
# ─────────────────────────────────────────────────────────────────────────


class ElevenLabsTTS:
    """ElevenLabs streaming TTS."""

    def __init__(self) -> None:
        import httpx

        self.key = os.environ.get("ELEVENLABS_API_KEY")
        if not self.key:
            raise RuntimeError("ELEVENLABS_API_KEY not set.")
        self.voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # default: Bella
        self.client = httpx.Client(timeout=60)

    def speak(self, text: str) -> None:
        import sounddevice as sd
        import numpy as np
        import io
        from pydub import AudioSegment

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        resp = self.client.post(
            url,
            headers={"xi-api-key": self.key, "Accept": "audio/mpeg"},
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.7, "speed": 1.05},
            },
        )
        resp.raise_for_status()

        audio = AudioSegment.from_mp3(io.BytesIO(resp.content))
        samples = np.array(audio.get_array_of_samples()).astype("float32") / 32768.0
        if audio.channels == 2:
            samples = samples.reshape(-1, 2).mean(axis=1)
        sd.play(samples, audio.frame_rate)
        sd.wait()


class LocalTTS:
    """pyttsx3 fallback — works offline, lower quality."""

    def __init__(self) -> None:
        import pyttsx3

        self.engine = pyttsx3.init()
        self.engine.setProperty("rate", 180)

    def speak(self, text: str) -> None:
        self.engine.say(text)
        self.engine.runAndWait()


# ─────────────────────────────────────────────────────────────────────────
#                              MAIN LOOP
# ─────────────────────────────────────────────────────────────────────────


def main() -> int:
    print("=" * 60)
    print("FlashRouter Voice Client")
    print("=" * 60)

    # Deferred dependency checks with helpful errors
    missing = []
    try:
        import sounddevice  # noqa: F401
    except ImportError:
        missing.append("sounddevice")
    try:
        import numpy  # noqa: F401
    except ImportError:
        missing.append("numpy")
    try:
        import keyboard  # noqa: F401
    except ImportError:
        missing.append("keyboard")
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        missing.append("faster-whisper")
    try:
        import httpx  # noqa: F401
    except ImportError:
        missing.append("httpx")

    if os.environ.get("USE_LOCAL_TTS", "false").lower() != "true":
        try:
            import pydub  # noqa: F401
        except ImportError:
            missing.append("pydub")

    if missing:
        print(f"\nMissing dependencies: {', '.join(missing)}")
        print("Install with:  pip install -r ops/voice/requirements.txt")
        return 1

    import keyboard  # type: ignore

    print("[init] loading Whisper...")
    transcriber = WhisperTranscriber(os.environ.get("WHISPER_MODEL", "base"))

    print("[init] connecting to Grok...")
    agent = GrokVoiceAgent()

    use_local_tts = os.environ.get("USE_LOCAL_TTS", "false").lower() == "true"
    if use_local_tts:
        print("[init] using local TTS (pyttsx3)")
        tts: Any = LocalTTS()
    else:
        print("[init] using ElevenLabs TTS")
        tts = ElevenLabsTTS()

    print("\nReady.")
    print("  Hold SPACE to talk.")
    print("  Press Q to quit.")
    print()

    recorder = MicRecorder()
    last_response = ""
    tmp_wav = REPO_ROOT / "ops" / "logs" / "last_input.wav"
    tmp_wav.parent.mkdir(parents=True, exist_ok=True)
    muted = False

    while True:
        try:
            if keyboard.is_pressed("q"):
                print("[bye]")
                break
            if keyboard.is_pressed("m"):
                muted = not muted
                print(f"[mute] {'on' if muted else 'off'}")
                time.sleep(0.3)
                continue
            if keyboard.is_pressed("r") and last_response and not muted:
                tts.speak(last_response)
                time.sleep(0.3)
                continue
            if keyboard.is_pressed("space"):
                print("[rec] listening...")
                recorder.start()
                while keyboard.is_pressed("space"):
                    time.sleep(0.05)
                pcm = recorder.stop()
                if not pcm:
                    continue
                save_wav(pcm, tmp_wav)

                print("[stt] transcribing...")
                transcript = transcriber.transcribe(tmp_wav)
                if not transcript.strip():
                    print("[stt] (silence)")
                    continue
                print(f"[you] {transcript}")

                print("[grok] thinking...")
                reply = agent.ask(transcript)
                last_response = reply
                print(f"[grok] {reply}")

                if not muted:
                    print("[tts] speaking...")
                    tts.speak(reply)
            else:
                time.sleep(0.03)
        except KeyboardInterrupt:
            print("\n[bye]")
            break
        except Exception as e:  # noqa: BLE001
            print(f"[error] {e}")
            time.sleep(1)

    return 0


if __name__ == "__main__":
    sys.exit(main())
