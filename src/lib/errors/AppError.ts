export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
