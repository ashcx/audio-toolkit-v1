import type { StorageReply, StoreOperation, StorageRequest } from "./protocol";
export class StorageClient {
  private sequence = 0;
  private replies = new Map<number, (reply: StorageReply) => void>();
  constructor(
    private send: (request: StorageRequest, transfer: Transferable[]) => void,
  ) {}
  receive(sequence: number, reply: StorageReply) {
    this.replies.get(sequence)?.(reply);
    this.replies.delete(sequence);
  }
  private async request(
    request: StoreOperation,
    transfer: Transferable[] = [],
  ) {
    const sequence = this.sequence++;
    const reply = await new Promise<StorageReply>((resolve) => {
      this.replies.set(sequence, resolve);
      this.send({ kind: "storage", sequence, request }, transfer);
    });
    if (reply.op === "error") throw new Error(reply.message);
    return reply;
  }
  async create(name: string, mime: string) {
    const reply = await this.request({ op: "create", name, mime });
    if (reply.op !== "create") throw new Error("Unexpected storage reply.");
    return reply.id;
  }
  async write(id: string, position: number, data: Uint8Array) {
    const owned = new Uint8Array(data);
    await this.request({ op: "write", id, position, data: owned }, [
      owned.buffer,
    ]);
  }
  async finish(id: string) {
    const reply = await this.request({ op: "finish", id });
    if (reply.op !== "finish") throw new Error("Unexpected storage reply.");
    return reply.file;
  }
  async discard(id: string) {
    await this.request({ op: "discard", id });
  }
}
