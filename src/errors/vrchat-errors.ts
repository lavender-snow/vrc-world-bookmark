export class WorldNotFoundError extends Error {}
export class VRChatServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VRChatServerError';
  }
}
