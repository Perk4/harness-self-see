import { DEFAULT_MAX_LINES } from "./types.ts";
import type {
  GateResult,
  JsonValue,
  LogEvent,
  LogHit,
  LogTail,
  Observation,
  SourceHit,
  Turn,
} from "./types.ts";

const HEADER =
  "## Self-observation\nBelow is your own source and your own runtime log. Read them before answering.";

export function assertSelfSee(
  source: SourceHit | undefined,
  log: LogTail,
): GateResult {
  if (source === undefined && log.events.length === 0) {
    return { ok: false, missing: ["source", "log"] };
  }
  if (source === undefined) {
    return { ok: false, missing: ["source"] };
  }
  if (!isNonEmpty(log.events)) {
    return { ok: false, missing: ["log"] };
  }
  return {
    ok: true,
    source,
    log: { events: log.events, omitted: log.omitted },
  };
}

export function injectObservation(
  turn: Turn,
  sourceHit: SourceHit,
  logHit: LogHit,
): Observation {
  const system = [turn.system, HEADER, renderSource(sourceHit), renderLog(logHit)]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join("\n\n");
  return { system, user: turn.user };
}

function isNonEmpty<T>(xs: readonly T[]): xs is readonly [T, ...T[]] {
  return xs.length > 0;
}

function renderSource(hit: SourceHit): string {
  const title =
    hit.omittedLines === 0
      ? `### Source ${hit.path}`
      : `### Source ${hit.path} (first ${DEFAULT_MAX_LINES} lines, ${hit.omittedLines} omitted)`;
  return `${title}\n\n\`\`\`\n${hit.text}\n\`\`\``;
}

function renderLog(hit: LogHit): string {
  const n = hit.events.length;
  const title =
    hit.omitted === 0
      ? `### Runtime log (${n} events)`
      : `### Runtime log (last ${n} of ${n + hit.omitted} events)`;
  return `${title}\n\n${hit.events.map(renderEvent).join("\n")}`;
}

function renderEvent(event: LogEvent): string {
  const head = `${event.ts} ${event.level.padEnd(5)} ${event.message}`;
  if (!event.fields) {
    return head;
  }
  return `${head} ${JSON.stringify(sortedFields(event.fields))}`;
}

function sortedFields(
  fields: Readonly<Record<string, JsonValue>>,
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const key of Object.keys(fields).sort()) {
    const value = fields[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
