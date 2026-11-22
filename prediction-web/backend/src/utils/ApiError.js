export class ApiError extends Error {
  constructor(statusCode, message, details, code) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = code;
  }

  static badRequest(msg = 'Bad request', details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to do this') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg); }
}
