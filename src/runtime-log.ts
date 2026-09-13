import { DEFAULT_TAIL, type LogTail, type RuntimeLog } from "./types.ts";

export function tailRuntimeLog(
  buffer: RuntimeLog,
  n = DEFAULT_TAIL,
): LogTail {
  const k = Math.max(0, Math.floor(n)) || 0;
  const events = buffer.slice(Math.max(0, buffer.length - k));
  return { events, omitted: buffer.length - events.length };
}
