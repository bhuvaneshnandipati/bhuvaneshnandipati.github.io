/**
 * Progressive scroll reveal. Content is fully visible without JavaScript and for anything
 * already on screen at load; only elements below the fold get a short rise as they enter.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

if (!reduce && 'IntersectionObserver' in window && els.length) {
  const vh = window.innerHeight;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.remove('is-pending');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  for (const el of els) {
    if (el.getBoundingClientRect().top > vh * 0.95) {
      el.classList.add('is-pending');
      io.observe(el);
    }
  }
  // Safety net: never leave content hidden (e.g. print, anchor jumps, observer quirks).
  window.addEventListener('beforeprint', () => els.forEach((el) => el.classList.remove('is-pending')));
  window.setTimeout(() => {
    for (const el of els) if (el.getBoundingClientRect().top < window.innerHeight) el.classList.remove('is-pending');
  }, 2500);
}
