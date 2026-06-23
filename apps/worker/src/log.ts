/* Tiny timestamped logger — the only place console is allowed. */
const ts = () => new Date().toISOString();

/** R9: failure listeners — dl-monitor registers a drain callback. */
type FailureListener = (msg: string) => void;
const listeners: FailureListener[] = [];
let notifying = false; // guard against infinite recursion
export function onWarn(fn: FailureListener) { listeners.push(fn); }

export const log = {
  info: (...args: unknown[]) => console.log(ts(), 'INFO ', ...args),
  warn: (...args: unknown[]) => {
    console.warn(ts(), 'WARN ', ...args);
    if (notifying) return; // prevent recursion: listener → log.warn → listener
    const msg = args.map((a) => typeof a === 'string' ? a : '').join(' ').trim();
    if (msg && (msg.includes('failed') || msg.includes('error'))) {
      notifying = true;
      for (const fn of listeners) try { fn(msg); } catch { /* swallow */ }
      notifying = false;
    }
  },
  error: (...args: unknown[]) => {
    console.error(ts(), 'ERROR', ...args);
    if (notifying) return;
    const msg = args.map((a) => typeof a === 'string' ? a : '').join(' ').trim();
    notifying = true;
    for (const fn of listeners) try { fn(msg); } catch { /* swallow */ }
    notifying = false;
  },
};
