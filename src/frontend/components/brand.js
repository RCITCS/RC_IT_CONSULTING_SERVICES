export function brandTemplate({ inverse = false } = {}) {
  return `<a class="brand" href="/">
    <span class="brand-mark" aria-hidden="true">RC</span>
    <span class="brand-copy"><strong${inverse ? ' style="color:white"' : ''}>RC IT Services</strong><span>Technology & Consulting</span></span>
  </a>`;
}
