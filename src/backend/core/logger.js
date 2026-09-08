function safeMeta(meta = {}) {
  const allowed = ['requestId', 'method', 'pathname', 'runtime', 'status', 'durationMs', 'code', 'provider', 'submissionType'];
  return Object.fromEntries(allowed.filter((key) => meta[key] !== undefined).map((key) => [key, meta[key]]));
}

export function createLogger(sink = console) {
  function emit(level, event, meta) {
    const target = typeof sink?.[level] === 'function' ? sink[level].bind(sink) : sink?.log?.bind(sink);
    if (!target) return;
    target(JSON.stringify({ level, event, ...safeMeta(meta), timestamp: new Date().toISOString() }));
  }

  return Object.freeze({
    info: (event, meta) => emit('info', event, meta),
    warn: (event, meta) => emit('warn', event, meta),
    error: (event, meta) => emit('error', event, meta)
  });
}

export const noopLogger = Object.freeze({ info() {}, warn() {}, error() {} });
