import marketplaceSalonService from '../services/MarketplaceSalonService.js';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendForbidden } from '../utils/apiResponse.js';

function canReadMarketplaceListing(user, row) {
  if (user.role === 'super_admin') return true;
  if (user.salonId && String(row.id) === String(user.salonId)) return true;
  if (row.submittedByUserId && String(row.submittedByUserId) === String(user.id)) return true;
  return false;
}

const list = async (req, res, next) => {
  try {
    const { status, city, q, limit, offset } = req.query;
    const { rows, count } = await marketplaceSalonService.listAdmin({
      status: status || undefined,
      city: city || undefined,
      q: q || undefined,
      limit,
      offset,
      tenantScope: req.user,
    });
    return sendSuccess(res, { rows, count }, 'Marketplace listings');
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const row = await marketplaceSalonService.getByIdForAdmin(req.params.id);
    if (!row) return sendNotFound(res, 'Listing not found');
    if (!canReadMarketplaceListing(req.user, row)) {
      return sendForbidden(res, 'You cannot view this listing.');
    }
    return sendSuccess(res, row, 'Listing');
  } catch (error) {
    next(error);
  }
};

const moderate = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendForbidden(res, 'Only platform super admins can moderate listings.');
    }
    const { listingStatus, adminReviewNotes, slug } = req.body || {};
    const allowed = ['pending', 'approved', 'rejected', 'changes_requested'];
    if (!allowed.includes(listingStatus)) {
      return sendBadRequest(res, 'Invalid listingStatus');
    }
    const row = await marketplaceSalonService.moderate({
      id: req.params.id,
      actorUserId: req.user.id,
      listingStatus,
      adminReviewNotes,
      slug,
    });
    return sendSuccess(res, row, 'Listing updated');
  } catch (error) {
    next(error);
  }
};

const createManual = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendForbidden(res, 'Only platform super admins can create listings manually.');
    }
    const b = req.body || {};
    if (!String(b.name || '').trim() || !String(b.description || '').trim()) {
      return sendBadRequest(res, 'name and description are required');
    }
    if (!String(b.addressLine1 || '').trim() || !String(b.city || '').trim()) {
      return sendBadRequest(res, 'addressLine1 and city are required');
    }
    const row = await marketplaceSalonService.createManual(
      {
        name: b.name,
        description: b.description,
        logoUrl: b.logoUrl,
        coverImageUrl: b.coverImageUrl,
        addressLine1: b.addressLine1,
        addressLine2: b.addressLine2,
        city: b.city,
        region: b.region,
        postalCode: b.postalCode,
        country: b.country,
        latitude: b.latitude,
        longitude: b.longitude,
        publicPhone: b.publicPhone,
        publicEmail: b.publicEmail,
        websiteUrl: b.websiteUrl,
        operatingHours: b.operatingHours,
        servicesCatalog: b.servicesCatalog,
        staffHighlights: b.staffHighlights,
        socialLinks: b.socialLinks,
        amenities: b.amenities,
        listingStatus: b.listingStatus,
        slug: b.slug,
        adminReviewNotes: b.adminReviewNotes,
      },
      req.user.id
    );
    return sendCreated(res, row, 'Salon listing created');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendForbidden(res, 'Only platform super admins can delete marketplace listings.');
    }
    await marketplaceSalonService.deleteListing(req.params.id);
    return sendSuccess(res, null, 'Listing deleted');
  } catch (error) {
    next(error);
  }
};

export { list, getOne, moderate, createManual, remove };
