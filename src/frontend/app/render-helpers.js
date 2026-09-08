import { responsiveImageMarkup } from './image-utils.js';

export function pageTitle(title) {
  document.title = title === 'Home' ? 'RC IT Services | Technology & Consulting' : `${title} | RC IT Services`;
}

function imageSizes(className = '') {
  if (className.includes('mini-photo')) return '(max-width: 640px) calc(100vw - 2rem), (max-width: 900px) 50vw, 33vw';
  if (className.includes('hero-photo')) return '(max-width: 900px) calc(100vw - 2rem), 46vw';
  return '(max-width: 640px) calc(100vw - 2rem), (max-width: 980px) calc(100vw - 3rem), 50vw';
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
    sizes: imageSizes(className),
    extra: cleanExtra
  });
}
