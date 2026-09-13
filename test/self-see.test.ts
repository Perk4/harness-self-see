import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import {
  assertSelfSee,
  injectObservation,
  loadSourceTree,
  tailRuntimeLog,
} from "../src/index.ts";
import type { LogEvent, SourceHit } from "../src/index.ts";

const fixtureRoot = fileURLToPath(
  new URL("../fixtures/toy-tree", import.meta.url),
);

const a: LogEvent = { ts: 1_789_255_201_000, level: "info", message: "boot" };
const b: LogEvent = {
  ts: 1_789_255_201_250,
  level: "warn",
  message: "retry",
  fields: { attempt: 2 },
};
const c: LogEvent = {
  ts: 1_789_255_201_500,
  level: "error",
  message: "tool failed",
};
const d: LogEvent = {
  ts: 1_789_255_201_750,
  level: "debug",
  message: "backoff",
};
const hit: SourceHit = {
  path: "src/tools/echo.ts",
  text: "export function echo(s: string): string {\n  return s;\n}",
  omittedLines: 0,
};

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const paddedText = [
  "line 1",
  "line 2",
  "line 3",
  "line 4",
  "line 5",
  "line 6",
  "line 7",
  "line 8",
  "line 9",
  "line 10",
  "line 11",
  "line 12",
  "line 13",
  "line 14",
  "line 15",
  "line 16",
  "line 17",
  "line 18",
  "line 19",
  "line 20",
  "line 21",
  "line 22",
  "line 23",
  "line 24",
  "line 25",
  "line 26",
  "line 27",
  "line 28",
  "line 29",
  "line 30",
  "line 31",
  "line 32",
  "line 33",
  "line 34",
  "line 35",
  "line 36",
  "line 37",
  "line 38",
  "line 39",
  "line 40",
].join("\n");

describe("loadSourceTree", () => {
  test("lists posix keys in code-unit order and reads echo", async () => {
    const tree = await loadSourceTree(fixtureRoot);
    expect([...tree.keys()]).toEqual([
      "README.md",
      "src/loop.ts",
      "src/padded.ts",
      "src/tools/echo.ts",
    ]);
    expect(tree.get("src/tools/echo.ts")).toEqual({
      path: "src/tools/echo.ts",
      text: "export function echo(s: string): string {\n  return s;\n}",
      omittedLines: 0,
    });
  });

  test("keeps the first 40 lines of padded.ts and reports 5 omitted", async () => {
    const tree = await loadSourceTree(fixtureRoot);
    expect(tree.get("src/padded.ts")).toEqual({
      path: "src/padded.ts",
      text: paddedText,
      omittedLines: 5,
    });
  });

  test("throws when the root is missing", async () => {
    await expect(loadSourceTree("fixtures/does-not-exist")).rejects.toThrow(
      "fixtures/does-not-exist",
    );
  });

  test("skips .git and node_modules planted in a temp copy", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "self-see-"));
    tmpDirs.push(tmp);
    await cp(fixtureRoot, tmp, { recursive: true });
    await mkdir(join(tmp, ".git"), { recursive: true });
    await writeFile(join(tmp, ".git", "HEAD"), "ref: refs/heads/main\n");
    await mkdir(join(tmp, "node_modules", "dep"), { recursive: true });
    await writeFile(
      join(tmp, "node_modules", "dep", "index.js"),
      "module.exports = {}\n",
    );
    const tree = await loadSourceTree(tmp);
    expect([...tree.keys()]).toEqual([
      "README.md",
      "src/loop.ts",
      "src/padded.ts",
      "src/tools/echo.ts",
    ]);
  });
});

describe("tailRuntimeLog", () => {
  test("returns an empty tail for an empty buffer", () => {
    expect(tailRuntimeLog([], 3)).toEqual({ events: [], omitted: 0 });
  });

  test("keeps the last n events", () => {
    expect(tailRuntimeLog([a, b, c, d], 2)).toEqual({
      events: [c, d],
      omitted: 2,
    });
  });

  test("n of 0 yields an empty tail", () => {
    expect(tailRuntimeLog([a, b], 0)).toEqual({ events: [], omitted: 2 });
  });
});

describe("assertSelfSee", () => {
  test("fails closed when both halves are missing", () => {
    expect(assertSelfSee(undefined, { events: [], omitted: 0 })).toEqual({
      ok: false,
      missing: ["source", "log"],
    });
  });

  test("fails closed when the log is empty", () => {
    expect(assertSelfSee(hit, { events: [], omitted: 0 })).toEqual({
      ok: false,
      missing: ["log"],
    });
  });

  test("fails closed when the source is missing", () => {
    expect(assertSelfSee(undefined, { events: [a], omitted: 0 })).toEqual({
      ok: false,
      missing: ["source"],
    });
  });

  test("passes the same objects as a proven pair", () => {
    expect(assertSelfSee(hit, { events: [a], omitted: 0 })).toEqual({
      ok: true,
      source: hit,
      log: { events: [a], omitted: 0 },
    });
  });

  test("a present empty file passes", () => {
    const empty: SourceHit = { path: "empty.txt", text: "", omittedLines: 0 };
    expect(assertSelfSee(empty, { events: [a], omitted: 0 })).toEqual({
      ok: true,
      source: empty,
      log: { events: [a], omitted: 0 },
    });
  });
});

describe("injectObservation", () => {
  test("renders source, raw timestamps, and sorted fields", () => {
    expect(
      injectObservation(
        { user: "Why did the retry fire?" },
        hit,
        { events: [a, b], omitted: 2 },
      ),
    ).toEqual({
      system: [
        "## Self-observation",
        "Below is your own source and your own runtime log. Read them before answering.",
        "",
        "### Source src/tools/echo.ts",
        "",
        "```",
        "export function echo(s: string): string {",
        "  return s;",
        "}",
        "```",
        "",
        "### Runtime log (last 2 of 4 events)",
        "",
        "1789255201000 info  boot",
        '1789255201250 warn  retry {"attempt":2}',
      ].join("\n"),
      user: "Why did the retry fire?",
    });
  });

  test("prefixes an existing system prompt", () => {
    expect(
      injectObservation(
        { system: "You are the loop.", user: "x" },
        hit,
        { events: [a], omitted: 0 },
      ).system,
    ).toMatch(/^You are the loop\.\n\n## Self-observation\n/);
  });

  test("does not include another fixture file body", () => {
    const bundle = injectObservation(
      { user: "Why did the retry fire?" },
      hit,
      { events: [a, b], omitted: 2 },
    );
    expect(bundle.system).not.toContain("await step(turn)");
  });

  test("sorts field keys before stringify", () => {
    const unsorted: LogEvent = {
      ts: 1,
      level: "info",
      message: "m",
      fields: { z: 1, a: 2 },
    };
    expect(
      injectObservation({ user: "x" }, hit, {
        events: [unsorted],
        omitted: 0,
      }).system,
    ).toContain('1 info  m {"a":2,"z":1}');
  });

  test("exports only the four functions", async () => {
    const api = await import("../src/index.ts");
    const fns = Object.entries(api)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort();
    expect(fns).toEqual([
      "assertSelfSee",
      "injectObservation",
      "loadSourceTree",
      "tailRuntimeLog",
    ]);
  });
});

// @ts-expect-error LogTail is not a LogHit
injectObservation({ user: "x" }, hit, tailRuntimeLog([a]));
