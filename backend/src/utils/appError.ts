export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, details?: any, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details?: any, code = 'BAD_REQUEST') {
    return new AppError(message, 400, details, code);
  }

  static unauthorized(message = 'Unauthorized access', details?: any, code = 'UNAUTHORIZED') {
    return new AppError(message, 401, details, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', details?: any, code = 'FORBIDDEN') {
    return new AppError(message, 403, details, code);
  }

  static notFound(message = 'Resource not found', details?: any, code = 'NOT_FOUND') {
    return new AppError(message, 404, details, code);
  }

  static conflict(message = 'Resource already exists or conflict occurred', details?: any, code = 'CONFLICT') {
    return new AppError(message, 409, details, code);
  }

  static unprocessable(message = 'Validation failed', details?: any, code = 'VALIDATION_ERROR') {
    return new AppError(message, 422, details, code);
  }

  static internal(message = 'Internal Server Error', details?: any, code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, details, code);
  }
}
