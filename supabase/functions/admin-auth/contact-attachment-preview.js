const SAFE_MEDIA = Object.freeze({
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'application/pdf': ['.pdf'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm']
});

export function attachmentPreview(filename, contentType) {
  const name = String(filename ?? '').toLowerCase();
  const mime = String(contentType ?? '').toLowerCase().trim();
  const extensions = Object.hasOwn(SAFE_MEDIA, mime) ? SAFE_MEDIA[mime] : null;
  if (!extensions?.some((extension) => name.endsWith(extension))) {
    return { kind: 'file', contentType: 'application/octet-stream' };
  }
  if (mime.startsWith('image/')) return { kind: 'image', contentType: mime };
  if (mime === 'application/pdf') return { kind: 'pdf', contentType: mime };
  if (mime.startsWith('audio/')) return { kind: 'audio', contentType: mime };
  if (mime.startsWith('video/')) return { kind: 'video', contentType: mime };
  return { kind: 'file', contentType: 'application/octet-stream' };
}

export const ATTACHMENT_PREVIEW_SCRIPT = `(() => {
  const dialog = document.getElementById('contact-attachment-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const stage = document.getElementById('contact-attachment-stage');
  const title = document.getElementById('contact-attachment-title');
  const download = document.getElementById('contact-attachment-download');
  const close = dialog.querySelector('[data-close-attachment]');
  if (!stage || !title || !download || !close) return;

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-attachment-preview]');
    if (!link) return;
    event.preventDefault();
    const name = link.dataset.filename || 'Attachment';
    const kind = link.dataset.previewKind || 'file';
    title.textContent = name;
    const previewUrl = new URL(link.href);
    const downloadUrl = new URL(link.href);
    downloadUrl.searchParams.delete('preview');
    downloadUrl.searchParams.set('download', '1');
    download.href = downloadUrl.toString();
    download.setAttribute('download', name);
    stage.replaceChildren();
    let content;
    if (kind === 'image') {
      content = document.createElement('img');
      content.alt = name;
    } else if (kind === 'pdf') {
      content = document.createElement('iframe');
      content.title = name;
      content.setAttribute('sandbox', '');
    } else if (kind === 'audio') {
      content = document.createElement('audio');
      content.controls = true;
    } else if (kind === 'video') {
      content = document.createElement('video');
      content.controls = true;
    } else {
      content = document.createElement('p');
      content.textContent = 'A browser preview is not available for this file type. Download it to open it in the appropriate app.';
    }
    if (kind !== 'file') content.src = previewUrl.toString();
    stage.append(content);
    dialog.showModal();
    close.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => stage.replaceChildren());

  const input = document.getElementById('contact-reply-files');
  const selection = document.getElementById('contact-selected-files');
  input?.addEventListener('change', () => {
    if (!selection) return;
    const files = Array.from(input.files || []);
    selection.textContent = files.length
      ? files.length + ' files selected: ' + files.map((file) => file.name).join(', ')
      : 'No files selected.';
  });
})();`;
