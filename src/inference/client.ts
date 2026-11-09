import { UserFacingError } from "../errors.ts";
import type { InferenceDone, InferenceReply, InferenceRequest } from "./protocol";
export class InferenceClient {
  private sequence = 0;
  private pending: { sequence: number; resolve: (reply: InferenceDone) => void; reject: (reason: unknown) => void } | null = null;
  private send: (message: InferenceRequest, transfer: Transferable[]) => void;
  constructor(send: (message: InferenceRequest, transfer: Transferable[]) => void) { this.send = send; }
  run(input: readonly Float32Array[]) {
    if (this.pending) return Promise.reject(new Error("The splitter received a window while another was pending."));
    const planes = input.map(plane => new Float32Array(plane)), sequence = ++this.sequence;
    return new Promise<InferenceDone>((resolve, reject) => {
      this.pending = { sequence, resolve, reject };
      this.send({ kind: "inference", sequence, planes }, planes.map(plane => plane.buffer));
    });
  }
  receive(sequence: number, reply: InferenceReply) {
    const pending = this.pending;
    if (!pending || pending.sequence !== sequence) return;
    this.pending = null;
    if (reply.kind === "error") pending.reject(new UserFacingError(reply.code));
    else pending.resolve(reply);
  }
}
