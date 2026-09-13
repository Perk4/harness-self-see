# harness-self-see

A harness can read its own source tree and the tail of its own runtime log. Four TypeScript functions implement that, with fixture files and an in-memory buffer. There is no live agent.

Source itch: [Exo: Harnesses should see their own code and logs](https://www.youtube.com/watch?v=5lFD-34dhqE) (Latent Space / Alex Krentsel). The prompt is a derived view of one file plus a tail of events. It is not a dump of the tree or the buffer.

This package is not harness-mw-hook. That sibling wraps a turn. This one loads a tree, tails a buffer, builds a prompt bundle, and fails closed when either half is missing.

## Four primitives

1. **`loadSourceTree(root)`.** Walks a directory into a `ReadonlyMap` of posix path to snippet. Skips `node_modules` and `.git`. Truncates each file after 40 lines.

2. **`tailRuntimeLog(buffer, n)`.** Returns the last `n` structured events from a caller-owned array. Default `n` is 20. Does not mutate the array.

3. **`injectObservation(turn, sourceHit, logHit)`.** Builds `{ system, user }` from one file and the tailed events. Does not call a model.

4. **`assertSelfSee(source, log)`.** Returns `{ ok: false, missing }` if the file is missing or the log is empty. Returns `{ ok: true, source, log }` when both are present. The pass branch is the only way to obtain a non-empty `LogHit` for inject.

## Not in scope

A live agent, a model call, network I/O, a watched filesystem, a durable log, and middleware around a turn.

## Run

```sh
npm install
npm test
npm run typecheck
```
