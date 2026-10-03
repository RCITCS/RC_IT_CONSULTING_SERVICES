These pinned browser libraries run only on the authenticated contact detail page to preview private attachments locally. No document bytes are sent to a third-party viewer.

- `mammoth.browser.min.module.js`: Mammoth 1.10.0, from `https://unpkg.com/mammoth@1.10.0/mammoth.browser.min.js`. License: `MAMMOTH-LICENSE`.
- `xlsx.full.min.module.js`: SheetJS Community Edition 0.20.3, from `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`. License: `SHEETJS-LICENSE`.

Each module exports the pinned browser bundle as a string so the existing authenticated admin function can serve it from the same origin. The bundle is loaded only when its file type is previewed. Upgrade both source URLs and licenses together.
