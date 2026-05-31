// ============ Header scroll state ============
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ============ Mobile menu ============
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );
}

// ============ Scroll reveal ============
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 60 + 'ms';
  io.observe(el);
});

// ============ Hero typewriter ============
// Tokenized lines so syntax highlighting survives the typed reveal.
const heroLines = [
  [
    ['key', 'import'], ['punc', ' { '], ['type', 'FlashRouter'], ['punc', ' } '],
    ['key', 'from'], ['str', ' "@flashrouter/sdk"'], ['punc', ';'],
  ],
  [],
  [['key', 'const'], ['var', ' fr'], ['punc', ' = '], ['key', 'new'], ['type', ' FlashRouter'], ['punc', '({ '], ['prop', 'chain'], ['punc', ': '], ['str', '"base"'], ['punc', ' });']],
  [],
  [['com', '// optimal lender + best fee, automatically']],
  [['key', 'await'], ['var', ' fr'], ['punc', '.'], ['fn', 'borrow'], ['punc', '({ '], ['prop', 'asset'], ['punc', ': '], ['str', '"USDC"'], ['punc', ', '], ['prop', 'amount'], ['punc', ': '], ['num', '5_000_000'], ['punc', ', '], ['var', 'execute'], ['punc', ' });']],
];

const target = document.getElementById('heroCode');

function buildStatic() {
  // Fallback: render fully without animation (reduced motion)
  let html = '';
  heroLines.forEach((line) => {
    html += '<span class="ln">';
    line.forEach(([t, txt]) => (html += `<span class="tok-${t}">${escape(txt)}</span>`));
    html += '</span>';
  });
  target.innerHTML = html;
}

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function typeWriter() {
  // Flatten into a queue of single characters with their token class.
  const queue = [];
  heroLines.forEach((line, li) => {
    line.forEach(([t, txt]) => {
      for (const ch of txt) queue.push({ t, ch, li });
    });
    if (li < heroLines.length - 1) queue.push({ nl: true, li });
  });

  let i = 0;
  // Pre-create line containers
  target.innerHTML = heroLines.map(() => '<span class="ln"></span>').join('') +
    '<span class="typewriter-cursor" id="twc"></span>';
  const lineEls = target.querySelectorAll('.ln');
  const cursor = document.getElementById('twc');

  // current token span per line to coalesce same-class chars
  let curSpan = null, curClass = null, curLine = -1;

  function step() {
    if (i >= queue.length) {
      cursor && cursor.remove();
      return;
    }
    const item = queue[i++];
    if (item.nl) {
      curSpan = null; curClass = null;
    } else {
      const lineEl = lineEls[item.li];
      if (curLine !== item.li || curClass !== item.t || !curSpan) {
        curSpan = document.createElement('span');
        curSpan.className = 'tok-' + item.t;
        lineEl.appendChild(curSpan);
        curClass = item.t; curLine = item.li;
      }
      curSpan.textContent += item.ch;
    }
    // move cursor to end of current line
    const speed = item.ch === ' ' ? 14 : 22 + Math.random() * 24;
    setTimeout(step, speed);
  }
  // start after a short beat
  setTimeout(step, 350);
}

if (target) {
  // Always render the complete code statically. The typewriter animation
  // looked busy and made screenshots appear truncated. Static is cleaner.
  buildStatic();
}
