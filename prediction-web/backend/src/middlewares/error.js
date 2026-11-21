import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 422;
    message = 'Please check the highlighted fields';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `That ${field} is already in use` : 'Duplicate value';
  } else if (err instanceof multer.MulterError) {
    status = 400;
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProd && !(err instanceof ApiError)) message = 'Something went wrong';
  }

  res.status(status).json({ success: false, message, ...(details && { errors: details }) });
}
