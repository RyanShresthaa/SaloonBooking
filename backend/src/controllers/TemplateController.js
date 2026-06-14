import { NotificationTemplate } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const listTemplates = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const templates = await NotificationTemplate.findAll({ where: { isActive: true, salonId } });
    return sendSuccess(res, templates, 'Templates retrieved');
  } catch (error) {
    next(error);
  }
};

const getTemplate = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template || String(template.salonId) !== String(salonId)) return sendNotFound(res, 'Template not found');
    return sendSuccess(res, template, 'Template retrieved');
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const { name, subject, body, requiresVip } = req.body;
    const template = await NotificationTemplate.create({
      name,
      subject,
      body,
      requiresVip: Boolean(requiresVip),
      salonId,
    });
    return sendCreated(res, template, 'Template created');
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template || String(template.salonId) !== String(salonId)) return sendNotFound(res, 'Template not found');
    await template.update(req.body);
    return sendSuccess(res, template, 'Template updated');
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template || String(template.salonId) !== String(salonId)) return sendNotFound(res, 'Template not found');
    await template.update({ isActive: false });
    return sendSuccess(res, null, 'Template deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate };
