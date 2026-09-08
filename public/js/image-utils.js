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
    const url = new URL(src, window.location.origin);
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
  const widths = [480, 720, 960, 1280, 1600];
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
  return `<img src="${esc(optimizedSrc)}"${srcset ? ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(alt)}" width="${width}" height="${height}" loading="${esc(loading)}" decoding="async" fetchpriority="${esc(fetchPriority)}"${className ? ` class="${esc(className)}"` : ''} ${extra}>`;
}
