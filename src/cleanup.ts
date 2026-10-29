export class CleanupFailure extends Error {
  readonly recover: () => Promise<void>;
  constructor(recover: () => Promise<void>) {
    super("Temporary files could not be removed. Retry cleanup.");
    this.recover = recover;
  }
}
export async function cleanupAll(actions: readonly (() => Promise<void>)[]): Promise<void> {
  const failed: (() => Promise<void>)[] = [];
  for (const action of actions) {
    try { await action(); } catch { failed.push(action); }
  }
  if (failed.length) throw new CleanupFailure(() => cleanupAll(failed));
}
