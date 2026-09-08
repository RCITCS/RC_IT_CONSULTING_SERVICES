import { responsiveImageMarkup } from './image-utils.js';

export function pageTitle(title) {
  document.title = title === 'Home' ? 'RC IT Services | Technology & Consulting' : `${title} | RC IT Services`;
}

export function imageTag(src, alt, extra = '') {
  const className = extra.match(/class="([^"]+)"/)?.[1] || '';
  const loading = extra.match(/loading="([^"]+)"/)?.[1] || 'lazy';
  const fetchPriority = extra.match(/fetchpriority="([^"]+)"/)?.[1] || (loading === 'eager' ? 'high' : 'auto');
  const cleanExtra = extra
    .replace(/\s*class="[^"]*"/g, '')
    .replace(/\s*loading="[^"]*"/g, '')
    .replace(/\s*fetchpriority="[^"]*"/g, '')
    .trim();

  return responsiveImageMarkup(src, alt, {
    className,
    loading,
    fetchPriority,
    extra: cleanExtra
  });
}
