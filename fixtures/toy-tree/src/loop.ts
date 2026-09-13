export async function loop(): Promise<void> {
  for (let turn = 0; turn < 3; turn++) {
    await step(turn);
  }
}
