import { Service } from '../models/Index.js';
import appointmentService from '../services/AppointmentService.js';
import { sendSuccess } from '../utils/apiResponse.js';

/** Anonymous-friendly listing for embeddable booking widgets. */
const listServicesPublic = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { isActive: true },
      attributes: [
        'id',
        'name',
        'description',
        'duration',
        'price',
        'bufferBeforeMinutes',
        'bufferAfterMinutes',
      ],
      order: [['name', 'ASC']],
    });
    return sendSuccess(res, services, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

const getAvailableSlotsPublic = async (req, res, next) => {
  try {
    const { serviceId, date, staffId } = req.query;
    const result = await appointmentService.getAvailableSlots(serviceId, date, staffId || null);
    return sendSuccess(res, result, 'Available slots retrieved');
  } catch (error) {
    next(error);
  }
};

export { listServicesPublic, getAvailableSlotsPublic };
