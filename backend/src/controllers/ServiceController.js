import { Service, SalonResource } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';
import { resolvePublicSalonId, requireStaffSalonId } from '../utils/salonScope.js';

// ─── Constants ───

const MIN_BUFFER_MINUTES = 0;

function resolveServiceSalonId(req) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    return requireStaffSalonId(req.user);
  }
  return resolvePublicSalonId(req.query.salonId);
}

// ─── Handlers ───

const listServices = async (req, res, next) => {
  try {
    const salonId = resolveServiceSalonId(req);
    const services = await Service.findAll({ where: { isActive: true, salonId }, order: [['name', 'ASC']] });
    return sendSuccess(res, services, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

const getService = async (req, res, next) => {
  try {
    const salonId = resolveServiceSalonId(req);
    const service = await Service.findByPk(req.params.id);
    if (!service || String(service.salonId) !== String(salonId)) return sendNotFound(res, 'Service not found');
    return sendSuccess(res, service, 'Service retrieved');
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const { name, description, duration, price, bufferBeforeMinutes, bufferAfterMinutes, resourceId } = req.body;
    let rid = resourceId;
    if (!rid) {
      const first = await SalonResource.findOne({
        where: { isActive: true, salonId },
        order: [['createdAt', 'ASC']],
      });
      rid = first?.id;
    }
    if (!rid) {
      return sendBadRequest(res, 'No salon resource exists yet for this salon.');
    }
    const resRow = await SalonResource.findByPk(rid);
    if (!resRow || String(resRow.salonId) !== String(salonId)) {
      return sendBadRequest(res, 'Invalid resource for this salon.');
    }
    const service = await Service.create({
      name,
      description,
      duration,
      price,
      salonId,
      bufferBeforeMinutes: Math.max(MIN_BUFFER_MINUTES, Number(bufferBeforeMinutes) || MIN_BUFFER_MINUTES),
      bufferAfterMinutes: Math.max(MIN_BUFFER_MINUTES, Number(bufferAfterMinutes) || MIN_BUFFER_MINUTES),
      resourceId: rid,
      platformCategoryId: req.body.platformCategoryId || null,
      discountPrice: req.body.discountPrice != null ? Number(req.body.discountPrice) : null,
      imageUrls: Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [],
      genderTag: req.body.genderTag ? String(req.body.genderTag).slice(0, 32) : null,
    });
    return sendCreated(res, service, 'Service created');
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const service = await Service.findByPk(req.params.id);
    if (!service || String(service.salonId) !== String(salonId)) return sendNotFound(res, 'Service not found');
    const allowed = [
      'name',
      'description',
      'duration',
      'price',
      'isActive',
      'bufferBeforeMinutes',
      'bufferAfterMinutes',
      'resourceId',
      'platformCategoryId',
      'discountPrice',
      'imageUrls',
      'genderTag',
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    await service.update(patch);
    return sendSuccess(res, service, 'Service updated');
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const service = await Service.findByPk(req.params.id);
    if (!service || String(service.salonId) !== String(salonId)) return sendNotFound(res, 'Service not found');
    await service.update({ isActive: false });
    return sendSuccess(res, null, 'Service deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listServices, getService, createService, updateService, deleteService };
