/** Errors carry machine-readable codes as well as a sentence humans can act on. */
export class DeckError extends Error {
  constructor(code, message, status = 400, details = []) {
    super(message); this.name = 'DeckError'; this.code = code;
    this.status = status; this.details = details;
  }
}
