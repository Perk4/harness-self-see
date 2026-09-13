export const DEFAULT_MAX_LINES = 40;
export const DEFAULT_TAIL = 20;
export const IGNORED_DIRS = ["node_modules", ".git"] as const;

export type LogLevel = "debug" | "info" | "warn" | "error";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type LogEvent = {
  readonly ts: number;
  readonly level: LogLevel;
  readonly message: string;
  readonly fields?: Readonly<Record<string, JsonValue>>;
};

export type RuntimeLog = readonly LogEvent[];

export type LogTail = {
  readonly events: readonly LogEvent[];
  readonly omitted: number;
};

export type LogHit = {
  readonly events: readonly [LogEvent, ...LogEvent[]];
  readonly omitted: number;
};

export type SourceHit = {
  readonly path: string;
  readonly text: string;
  readonly omittedLines: number;
};

export type SourceTree = ReadonlyMap<string, SourceHit>;

export type Turn = {
  readonly system?: string;
  readonly user: string;
};

export type Observation = {
  readonly system: string;
  readonly user: string;
};

export type Missing =
  | readonly ["source"]
  | readonly ["log"]
  | readonly ["source", "log"];

export type GateResult =
  | { readonly ok: true; readonly source: SourceHit; readonly log: LogHit }
  | { readonly ok: false; readonly missing: Missing };
