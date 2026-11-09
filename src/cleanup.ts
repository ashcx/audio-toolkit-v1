import { UserFacingError } from "./errors.ts";
export class CleanupFailure extends UserFacingError {
  readonly recover: () => Promise<void>;
  constructor(recover: () => Promise<void>) {
    super("storage-stuck", "Stored files could not be removed.");
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
