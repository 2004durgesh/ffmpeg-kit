export class Log {
  #sessionId: number;
  #level: number;
  #message: string;

  constructor(sessionId: number, level: number, message: string) {
    this.#sessionId = sessionId;
    this.#level = level;
    this.#message = message;
  }

  getSessionId(): number {
    return this.#sessionId;
  }
  getLevel(): number {
    return this.#level;
  }
  getMessage(): string {
    return this.#message;
  }
}
