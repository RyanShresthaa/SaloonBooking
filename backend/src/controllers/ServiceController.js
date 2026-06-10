import { Service, SalonResource } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';

const listServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    return sendSuccess(res, services, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

const getService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return sendNotFound(res, 'Service not found');
    return sendSuccess(res, service, 'Service retrieved');
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { name, description, duration, price, bufferBeforeMinutes, bufferAfterMinutes, resourceId } = req.body;
    let rid = resourceId;
    if (!rid) {
      const first = await SalonResource.findOne({ where: { isActive: true }, order: [['createdAt', 'ASC']] });
      rid = first?.id;
    }
    if (!rid) {
      return sendBadRequest(res, 'No salon resource exists yet. Run database migrations.');
    }
    const service = await Service.create({
      name,
      description,
      duration,
      price,
      bufferBeforeMinutes: Math.max(0, Number(bufferBeforeMinutes) || 0),
      bufferAfterMinutes: Math.max(0, Number(bufferAfterMinutes) || 0),
      resourceId: rid,
    });
    return sendCreated(res, service, 'Service created');
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return sendNotFound(res, 'Service not found');
    await service.update(req.body);
    return sendSuccess(res, service, 'Service updated');
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return sendNotFound(res, 'Service not found');
    await service.update({ isActive: false });
    return sendSuccess(res, null, 'Service deleted');
  } catch (error) {
    next(error);
  }
};

export { listServices, getService, createService, updateService, deleteService };
