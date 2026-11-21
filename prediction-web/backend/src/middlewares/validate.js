import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/** Runs an array of express-validator chains and turns failures into a 422. */
export const validate = (chains) => [
  ...chains,
  (req, _res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = {};
    for (const err of result.array()) {
      if (!errors[err.path]) errors[err.path] = err.msg;
    }
    const error = new ApiError(422, 'Please check the highlighted fields', errors);
    next(error);
  },
];
