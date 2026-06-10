import { NotificationTemplate } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponse.js';

const listTemplates = async (req, res, next) => {
  try {
    const templates = await NotificationTemplate.findAll({ where: { isActive: true } });
    return sendSuccess(res, templates, 'Templates retrieved');
  } catch (error) {
    next(error);
  }
};

const getTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template) return sendNotFound(res, 'Template not found');
    return sendSuccess(res, template, 'Template retrieved');
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const { name, subject, body, requiresVip } = req.body;
    const template = await NotificationTemplate.create({
      name,
      subject,
      body,
      requiresVip: Boolean(requiresVip),
    });
    return sendCreated(res, template, 'Template created');
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template) return sendNotFound(res, 'Template not found');
    await template.update(req.body);
    return sendSuccess(res, template, 'Template updated');
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findByPk(req.params.id);
    if (!template) return sendNotFound(res, 'Template not found');
    await template.update({ isActive: false });
    return sendSuccess(res, null, 'Template deleted');
  } catch (error) {
    next(error);
  }
};

export { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate };
