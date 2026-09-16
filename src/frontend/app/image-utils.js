function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function withWidth(src, width) {
  try {
    const base = globalThis.location?.origin || 'https://rc-it-services.invalid';
    const url = new URL(src, base);
    const host = url.hostname.toLowerCase();
    if (host === 'images.pexels.com') {
      url.searchParams.set('auto', 'compress');
      url.searchParams.set('cs', 'tinysrgb');
      url.searchParams.set('w', String(width));
      return url.toString();
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

function responsiveSet(src) {
  // 640 closes the common mobile-DPR gap between the former 480 and 720 candidates.
  const widths = [320, 480, 640, 720, 960, 1280, 1600];
  const candidates = widths.map((width) => `${withWidth(src, width)} ${width}w`);
  return candidates.every((candidate) => candidate.startsWith(src)) ? '' : candidates.join(', ');
}

export function responsiveImageMarkup(src, alt, {
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes = '(max-width: 640px) calc(100vw - 2rem), (max-width: 980px) calc(100vw - 3rem), 50vw',
  width = 1600,
  height = 1000,
  extra = ''
} = {}) {
  const srcset = responsiveSet(src);
  const optimizedSrc = withWidth(src, 1280);
  const priority = fetchPriority === 'auto' ? '' : ` fetchpriority="${esc(fetchPriority)}"`;
  const decoding = loading === 'eager' && fetchPriority === 'high' ? 'sync' : 'async';
  return `<img src="${esc(optimizedSrc)}"${srcset ? ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(alt)}" width="${width}" height="${height}" loading="${esc(loading)}" decoding="${decoding}"${priority}${className ? ` class="${esc(className)}"` : ''}${extra ? ` ${extra}` : ''}>`;
}
