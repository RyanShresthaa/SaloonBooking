import api from '../axios';

export interface AuditLogRow {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; name?: string; email?: string } | null;
}

export const listAuditLogs = (params?: { limit?: number; offset?: number; entityType?: string }) =>
  api.get('/audit-logs', { params });
