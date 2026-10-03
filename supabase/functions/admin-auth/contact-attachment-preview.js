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
  'video/webm': ['.webm'],
  'text/plain': ['.txt', '.log'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.ms-excel.sheet.binary.macroenabled.12': ['.xlsb']
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
  if (mime === 'text/plain' || mime === 'text/csv' || mime === 'application/json') return { kind: 'text', contentType: 'text/plain; charset=utf-8' };
  if (name.endsWith('.docx')) return { kind: 'document', contentType: mime };
  if (/\.(xlsx|xls|xlsb)$/.test(name)) return { kind: 'spreadsheet', contentType: mime };
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
  const libraries = {};
  const scriptBase = document.currentScript?.src || location.href;
  let previewNumber = 0;
  let activePdfUrl = null;
  function clearStage() {
    stage.replaceChildren();
    if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
    activePdfUrl = null;
  }
  function loadLibrary(name) {
    if (!libraries[name]) libraries[name] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('preview-library/' + name + '.js', scriptBase).toString();
      script.onload = resolve;
      script.onerror = () => reject(new Error('Preview library could not be loaded.'));
      document.head.append(script);
    });
    return libraries[name];
  }
  function message(value) {
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    clearStage();
    stage.append(paragraph);
  }
  async function renderPdf(url, name, requestNumber) {
    try {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok || !String(response.headers.get('content-type') || '').toLowerCase().startsWith('application/pdf')) throw new Error('PDF unavailable');
      const bytes = await response.arrayBuffer();
      if (requestNumber !== previewNumber || !dialog.open) return;
      const signature = new TextDecoder('ascii').decode(bytes.slice(0, 1024));
      if (!signature.includes('%PDF-')) throw new Error('Invalid PDF');
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (requestNumber !== previewNumber || !dialog.open) { URL.revokeObjectURL(blobUrl); return; }
      const frame = document.createElement('iframe');
      frame.title = name;
      frame.src = blobUrl;
      clearStage();
      activePdfUrl = blobUrl;
      stage.append(frame);
    } catch {
      if (requestNumber === previewNumber && dialog.open) message('PDF preview could not be loaded. You can download the file.');
    }
  }
  async function renderOffice(kind, url, requestNumber) {
    try {
      const library = kind === 'document' ? 'mammoth' : 'xlsx';
      const [response] = await Promise.all([fetch(url, { credentials: 'same-origin', cache: 'no-store' }), loadLibrary(library)]);
      if (!response.ok) throw new Error('Attachment could not be loaded.');
      const bytes = await response.arrayBuffer();
      if (requestNumber !== previewNumber || !dialog.open) return;
      if (kind === 'document') {
        const result = await window.mammoth.extractRawText({ arrayBuffer: bytes });
        if (requestNumber !== previewNumber || !dialog.open) return;
        const pre = document.createElement('pre');
        pre.className = 'attachment-preview-text';
        pre.textContent = result.value || 'This document has no readable text.';
        stage.replaceChildren(pre);
      } else {
        const workbook = window.XLSX.read(bytes, { type: 'array', sheetRows: 201 });
        const container = document.createElement('div');
        container.className = 'attachment-preview-workbook';
        for (const name of workbook.SheetNames.slice(0, 10)) {
          const heading = document.createElement('h3');
          heading.textContent = name;
          container.append(heading);
          const table = document.createElement('table');
          const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
          for (const row of rows.slice(0, 200)) {
            const tr = document.createElement('tr');
            for (const cell of row.slice(0, 30)) {
              const td = document.createElement('td');
              td.textContent = String(cell ?? '');
              tr.append(td);
            }
            table.append(tr);
          }
          container.append(table);
        }
        if (requestNumber !== previewNumber || !dialog.open) return;
        stage.replaceChildren(container);
      }
    } catch {
      if (requestNumber === previewNumber && dialog.open) message('This file could not be previewed. You can download it and open it in the appropriate app.');
    }
  }

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
    clearStage();
    const requestNumber = ++previewNumber;
    let content;
    if (kind === 'image') {
      content = document.createElement('img');
      content.alt = name;
    } else if (kind === 'pdf') {
      content = document.createElement('p');
      content.textContent = 'Loading PDF preview…';
    } else if (kind === 'audio') {
      content = document.createElement('audio');
      content.controls = true;
    } else if (kind === 'video') {
      content = document.createElement('video');
      content.controls = true;
    } else if (kind === 'text' || kind === 'document' || kind === 'spreadsheet') {
      content = document.createElement('p');
      content.textContent = 'Loading preview…';
    } else {
      content = document.createElement('p');
      content.textContent = 'A browser preview is not available for this file type. Download it to open it in the appropriate app.';
    }
    if (['image', 'audio', 'video'].includes(kind)) content.src = previewUrl.toString();
    stage.append(content);
    dialog.showModal();
    close.focus();
    if (kind === 'image') content.onerror = () => message('Image preview could not be loaded. You can download the file.');
    if (kind === 'pdf') renderPdf(previewUrl, name, requestNumber);
    if (kind === 'text') fetch(previewUrl, { credentials: 'same-origin', cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Attachment unavailable');
      const pre = document.createElement('pre');
      pre.className = 'attachment-preview-text';
      pre.textContent = (await response.text()).slice(0, 500000);
      if (requestNumber === previewNumber && dialog.open) stage.replaceChildren(pre);
    }).catch(() => { if (requestNumber === previewNumber && dialog.open) message('Text preview could not be loaded.'); });
    if (kind === 'document' || kind === 'spreadsheet') renderOffice(kind, previewUrl, requestNumber);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { ++previewNumber; clearStage(); });

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
