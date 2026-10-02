function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pexelsPhotoId(url) {
  if (url.hostname.toLowerCase() !== 'images.pexels.com') return null;
  const match = url.pathname.match(/^\/photos\/(\d{1,12})\/pexels-photo-\1\.(?:jpe?g)$/i);
  return match?.[1] || null;
}

function withWidth(src, width) {
  try {
    const base = globalThis.location?.origin || 'https://rc-it-services.invalid';
    const url = new URL(src, base);
    const host = url.hostname.toLowerCase();
    const pexelsId = pexelsPhotoId(url);
    if (pexelsId) {
      return `/media/pexels/${pexelsId}?w=${encodeURIComponent(String(width))}`;
    }
    if (host === 'images.unsplash.com') {
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', '82');
      return url.toString();
    }
  } catch {
    return src;
  }
  return src;
}

function responsiveSet(src, widths = [320, 480, 640, 960, 1280, 1600]) {
  const candidates = widths.map((width) => `${withWidth(src, width)} ${width}w`);
  return candidates.every((candidate) => candidate.startsWith(src)) ? '' : candidates.join(', ');
}

export function responsiveImageMarkup(src, alt, {
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  sizes = '(max-width: 640px) calc(100vw - 2rem), (max-width: 980px) calc(100vw - 3rem), 50vw',
  width = 1600,
  height = 1000,
  extra = '',
  mobileMaxWidth = 0
} = {}) {
  const srcset = responsiveSet(src);
  const mobileWidths = mobileMaxWidth > 0 ? [320, 480, 640].filter((width) => width <= mobileMaxWidth) : [];
  const mobileSrcset = mobileWidths.length ? responsiveSet(src, mobileWidths) : '';
  const optimizedSrc = withWidth(src, 1280);
  const priority = fetchPriority === 'auto' ? '' : ` fetchpriority="${esc(fetchPriority)}"`;
  const decodeMode = decoding === 'sync' ? 'sync' : 'async';
  const image = `<img src="${esc(optimizedSrc)}"${srcset ? ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(alt)}" width="${width}" height="${height}" loading="${esc(loading)}" decoding="${decodeMode}"${priority}${className ? ` class="${esc(className)}"` : ''}${extra ? ` ${extra}` : ''}>`;
  if (!mobileSrcset) return image;
  return `<picture><source media="(max-width: 900px)" srcset="${esc(mobileSrcset)}" sizes="calc(100vw - 2rem)">${image}</picture>`;
}
