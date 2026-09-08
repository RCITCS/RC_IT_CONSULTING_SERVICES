import { esc } from './components.js';

export function pageTitle(title) {
  document.title = title === 'Home' ? 'RC IT Services | Technology & Consulting' : `${title} | RC IT Services`;
}

export function imageTag(src, alt, extra = '') {
  return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${extra}>`;
}

