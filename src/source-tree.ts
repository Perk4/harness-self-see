import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_MAX_LINES,
  IGNORED_DIRS,
  type SourceHit,
  type SourceTree,
} from "./types.ts";

export async function loadSourceTree(root: string): Promise<SourceTree> {
  let info;
  try {
    info = await stat(root);
  } catch (error) {
    const code =
      error instanceof Error && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      throw new Error(`root is missing or not a directory: ${root}`);
    }
    throw error;
  }
  if (!info.isDirectory()) {
    throw new Error(`root is missing or not a directory: ${root}`);
  }

  const hits: Array<readonly [string, SourceHit]> = [];
  await walk(root, "", hits);
  hits.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(hits);
}

async function walk(
  absDir: string,
  relDir: string,
  hits: Array<readonly [string, SourceHit]>,
): Promise<void> {
  const entries = await readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    if (isIgnoredDir(entry.name) || entry.isSymbolicLink()) {
      continue;
    }
    const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      await walk(abs, rel, hits);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const contents = await readFile(abs, "utf8");
    hits.push([rel, toSnippet(rel, contents, DEFAULT_MAX_LINES)]);
  }
}

function isIgnoredDir(name: string): boolean {
  for (const dir of IGNORED_DIRS) {
    if (dir === name) {
      return true;
    }
  }
  return false;
}

function toSnippet(path: string, contents: string, maxLines: number): SourceHit {
  const lines = contents.split("\n");
  if (contents.endsWith("\n")) {
    lines.pop();
  }
  const omittedLines = Math.max(0, lines.length - maxLines);
  return {
    path,
    text: lines.slice(0, maxLines).join("\n"),
    omittedLines,
  };
}
