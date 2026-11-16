export type StepOpen = Readonly<{ id: string; open: boolean; by: "user" | "added"; problem: boolean }>;

export function isStepOpen(state: StepOpen | null, id: string, problem: boolean, mobile: boolean): boolean {
  if (!mobile) return state?.id === id && state.open;
  if (state?.id === id && state.by === "user" && (state.open || state.problem === problem)) return state.open;
  return problem;
}
