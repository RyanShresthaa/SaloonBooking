import auditService from '../services/AuditService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ─── Constants ───

const DEFAULT_AUDIT_LIMIT = 50;
const MAX_AUDIT_LIMIT = 200;
const MIN_AUDIT_LIMIT = 1;
const DEFAULT_AUDIT_OFFSET = 0;
const ENTITY_TYPE_MAX_LEN = 80;

// ─── Handlers ───

const listAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || String(DEFAULT_AUDIT_LIMIT)), 10) || DEFAULT_AUDIT_LIMIT, MIN_AUDIT_LIMIT),
      MAX_AUDIT_LIMIT
    );
    const offset = Math.max(parseInt(String(req.query.offset || String(DEFAULT_AUDIT_OFFSET)), 10) || DEFAULT_AUDIT_OFFSET, 0);
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType.trim() : '';
    const rows = await auditService.listLogs({
      limit,
      offset,
      entityType: entityType.length > 0 ? entityType.slice(0, ENTITY_TYPE_MAX_LEN) : undefined,
    });
    return sendSuccess(res, rows, 'Audit logs retrieved');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listAuditLogs };
