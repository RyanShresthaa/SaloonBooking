import { validationResult } from 'express-validator';
import { sendBadRequest } from '../utils/apiResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendBadRequest(res, 'Validation failed', formatted);
  }
  next();
};

export default validate;
