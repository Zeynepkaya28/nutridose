/** Bad user input. The message is Turkish and safe to show to the user. */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}
