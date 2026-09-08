export function bindDesktopNav() {
  const items = [...document.querySelectorAll('[data-nav-item]')];
  const closeAll = (except = null) => items.forEach((item) => {
    if (item === except) return;
    item.classList.remove('is-open');
    item.querySelector('.nav-trigger')?.setAttribute('aria-expanded','false');
  });
  for (const item of items) {
    const trigger = item.querySelector('.nav-trigger');
    trigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !item.classList.contains('is-open');
      closeAll(item);
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      item.addEventListener('mouseenter', () => { closeAll(item); item.classList.add('is-open'); trigger?.setAttribute('aria-expanded','true'); });
      item.addEventListener('mouseleave', () => { item.classList.remove('is-open'); trigger?.setAttribute('aria-expanded','false'); });
    }
  }
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAll(); document.querySelector('.nav-trigger:focus')?.blur(); } });
}

export function bindMobileNav() {
  const button = document.querySelector('.mobile-menu-button');
  const panel = document.getElementById('mobile-panel');
  const sheet = panel?.querySelector('.mobile-panel__sheet');
  const closeButton = panel?.querySelector('.mobile-close');
  let previousFocus = null;
  const open = () => {
    previousFocus = document.activeElement;
    panel.style.display = 'block'; panel.setAttribute('aria-hidden','false'); button.setAttribute('aria-expanded','true'); document.body.classList.add('nav-open'); closeButton?.focus();
  };
  const close = () => {
    panel.style.display = 'none'; panel.setAttribute('aria-hidden','true'); button.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); previousFocus?.focus?.();
  };
  button?.addEventListener('click', open);
  closeButton?.addEventListener('click', close);
  panel?.addEventListener('mousedown', (event) => { if (event.target === panel) close(); });
  panel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  panel?.querySelectorAll('[data-mobile-accordion]').forEach((item) => {
    const trigger = item.querySelector('.mobile-accordion__trigger');
    trigger?.addEventListener('click', () => { const isOpen = item.classList.toggle('is-open'); trigger.setAttribute('aria-expanded',String(isOpen)); });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel?.getAttribute('aria-hidden') === 'false') close();
    if (event.key === 'Tab' && panel?.getAttribute('aria-hidden') === 'false' && sheet) {
      const focusable = [...sheet.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')].filter((el)=>!el.disabled);
      if (!focusable.length) return;
      const first=focusable[0], last=focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  addEventListener('resize', () => { if (innerWidth > 1100 && panel?.getAttribute('aria-hidden') === 'false') close(); });
}

