import express from 'express';
import env from '../config/Env.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = express.Router();

/** Public feature flags for the SPA (no secrets). */
router.get('/features', (req, res) => {
  return sendSuccess(res, env.features, 'Feature flags');
});

export default router;
