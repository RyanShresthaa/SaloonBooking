import auditService from '../services/AuditService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const listAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType.trim() : '';
    const rows = await auditService.listLogs({
      limit,
      offset,
      entityType: entityType.length > 0 ? entityType.slice(0, 80) : undefined,
    });
    return sendSuccess(res, rows, 'Audit logs retrieved');
  } catch (error) {
    next(error);
  }
};

export { listAuditLogs };
