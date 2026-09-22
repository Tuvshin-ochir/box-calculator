export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundError(resource) {
  return new AppError(
    `${resource.toUpperCase()}_NOT_FOUND`,
    `${resource} not found.`,
    404,
  );
}
