// ============================
// PALETTE MIRROR (in sync with CSS)
// ============================
const C = {
  brandCore: '#5cb810',
  brandLight: '#45cb0b',
  brandMuted: '#7fd14e',
  brandDeep: '#2d7a2d',
  warmthPrimary: '#fcb212',
  warmthAmber: '#fa741e',
  accentRoyal: '#3e55b3',
  accentSky: '#1ea2c6',
  accentPink: '#ec367d',
  greyBody: '#5E5E5E',
  greyMuted: '#9CA3AF',
  textPrimary: '#252117',
};

// ============================
// DOM BUILDER (kept for potential future use, not required here)
// ============================
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  if (typeof children === 'string') e.textContent = children;
  else children.forEach(c => e.appendChild(c));
  return e;
}

// ============================
// ANIMATION MODULE
// ============================
const Anim = {
  enabled: true,
  init() {
    gsap.defaults({ ease: 'power3.out', duration: 0.6 });
    gsap.registerPlugin(ScrollTrigger);
    this.checkReducedMotion();
    this.attachMicroInteractions();
    return this;
  },
  checkReducedMotion() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      this.enabled = false;
      gsap.globalTimeline.timeScale(20);
    }
    mq.addEventListener('change', (e) => {
      this.enabled = !e.matches;
      gsap.globalTimeline.timeScale(e.matches ? 20 : 1);
    });
  },
  animatePage(container) {
    if (!this.enabled) return;
    // Reveal cards
    const cards = container.querySelectorAll('.anim-card');
    gsap.fromTo(cards,
      { opacity: 0, y: 30, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)', stagger: { amount: 0.5, from: 'start' } }
    );
    // Scroll reveal for any new sections
    ScrollTrigger.batch(cards, {
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)' }),
      start: 'top 88%',
      once: true
    });
  },
  startAmbient() {
    if (!this.enabled) return;
    const dot = document.querySelector('.pulse-dot');
    if (dot && !dot._gsapBreathing) {
      dot._gsapBreathing = true;
      gsap.to(dot, { scale: 1.4, opacity: 0.5, duration: 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }
  },
  attachMicroInteractions() {
    // Hover lift on cards
    document.querySelector('body').addEventListener('mouseover', (e) => {
      const card = e.target.closest('.stat-card, .hero-banner');
      if (card) {
        gsap.to(card, { y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)', duration: 0.25, ease: 'power2.out' });
      }
    });
    document.querySelector('body').addEventListener('mouseout', (e) => {
      const card = e.target.closest('.stat-card, .hero-banner');
      if (card) {
        gsap.to(card, { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', duration: 0.35, ease: 'back.out(1.7)' });
      }
    });
    // Button press
    document.querySelector('body').addEventListener('mousedown', (e) => {
      const btn = e.target.closest('.btn-primary');
      if (btn) gsap.to(btn, { scale: 0.96, duration: 0.08, ease: 'power2.in' });
    });
    document.querySelector('body').addEventListener('mouseup', (e) => {
      const btn = e.target.closest('.btn-primary');
      if (btn) gsap.to(btn, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    });
  }
};

// ============================
// BOOTSTRAP
// ============================
document.addEventListener('DOMContentLoaded', () => {
  Anim.init();
  // Animate the whole page on load
  Anim.animatePage(document.body);
  // Start any ambient animations (hero glows)
  Anim.startAmbient();
});