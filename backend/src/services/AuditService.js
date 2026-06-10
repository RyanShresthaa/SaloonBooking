import { Op } from 'sequelize';
import { AuditLog } from '../models/Index.js';
import logger from '../utils/Logger.js';

class AuditService {
  async listLogs({ limit = 50, offset = 0, entityType } = {}) {
    const where = {};
    if (entityType) {
      where.entityType = { [Op.eq]: entityType };
    }
    return AuditLog.findAll({
      where,
      include: [{ association: 'actor', attributes: ['id', 'name', 'email'], required: false }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  }

  async log({ actorUserId, action, entityType, entityId, metadata }) {
    try {
      await AuditLog.create({
        actorUserId: actorUserId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata || null,
      });
    } catch (e) {
      logger.warn(`Audit log skipped: ${e.message}`);
    }
  }
}

export default new AuditService();
