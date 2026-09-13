export class HttpError extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;

  constructor(statusCode: number, message: string, errorCode?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}
