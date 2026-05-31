#!/usr/bin/env python3
"""
Minimal one-shot push-to-talk: record once, transcribe, ask Grok, speak,
exit. Useful for binding to a Stream Deck button or a global hotkey via
AutoHotkey / Hammerspoon / xbindkeys.

Run:
    python push_to_talk.py [--seconds=5]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Import the loop bits from voice_client
sys.path.insert(0, str(Path(__file__).parent))
from voice_client import (  # type: ignore
    MicRecorder,
    WhisperTranscriber,
    GrokVoiceAgent,
    ElevenLabsTTS,
    LocalTTS,
    save_wav,
)
import os
import time


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=5, help="Record duration")
    args = parser.parse_args()

    recorder = MicRecorder()
    transcriber = WhisperTranscriber(os.environ.get("WHISPER_MODEL", "base"))
    agent = GrokVoiceAgent()
    tts = LocalTTS() if os.environ.get("USE_LOCAL_TTS", "false").lower() == "true" else ElevenLabsTTS()

    print(f"[rec] recording for {args.seconds}s...")
    recorder.start()
    time.sleep(args.seconds)
    pcm = recorder.stop()

    tmp = Path(__file__).parent.parent / "logs" / "pt_last.wav"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    save_wav(pcm, tmp)

    text = transcriber.transcribe(tmp)
    print(f"[you] {text}")

    reply = agent.ask(text)
    print(f"[grok] {reply}")

    tts.speak(reply)
    return 0


if __name__ == "__main__":
    sys.exit(main())
