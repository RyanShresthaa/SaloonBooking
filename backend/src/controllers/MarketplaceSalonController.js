import marketplaceSalonService from '../services/MarketplaceSalonService.js';
import { MarketplaceSalon } from '../models/Index.js';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

/** Minimum viable listing data for review (services, pricing, facilities, hours, public contact). */
function validateAndNormalizeApplication(body) {
  const msgs = [];
  const rawCatalog = Array.isArray(body.servicesCatalog) ? body.servicesCatalog : [];
  const servicesCatalog = [];
  for (let i = 0; i < rawCatalog.length; i += 1) {
    const row = rawCatalog[i];
    if (!row || typeof row !== 'object') {
      msgs.push(`Service row ${i + 1} is invalid.`);
      break;
    }
    const name = String(row.name || '').trim();
    const price = Number(row.price);
    if (!name) msgs.push(`Service ${i + 1}: name is required.`);
    if (!Number.isFinite(price) || price < 0) msgs.push(`Service ${i + 1}: price must be a number ≥ 0.`);
    if (name && Number.isFinite(price) && price >= 0) {
      servicesCatalog.push({ name, price });
    }
  }
  if (servicesCatalog.length < 2) {
    msgs.push('Add at least two services, each with a name and a numeric price ≥ 0.');
  }

  let amenitiesIn = body.amenities;
  if (!Array.isArray(amenitiesIn)) amenitiesIn = [];
  const amenities = amenitiesIn.map((a) => String(a ?? '').trim()).filter(Boolean);
  if (amenities.length < 2) {
    msgs.push('List at least two facilities or amenities (e.g. Wi-Fi, parking, AC).');
  }

  if (!String(body.publicPhone || '').trim()) {
    msgs.push('Public phone is required.');
  }
  const pubEmail = String(body.publicEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pubEmail)) {
    msgs.push('A valid public contact email is required.');
  }

  let hoursSummary = '';
  const oh = body.operatingHours;
  if (oh && typeof oh === 'object' && oh.summary != null) {
    hoursSummary = String(oh.summary).trim();
  } else if (typeof oh === 'string') {
    hoursSummary = oh.trim();
  }
  if (hoursSummary.length < 8) {
    msgs.push('Describe typical opening hours (at least ~8 characters, e.g. Mon–Sat 9:00–19:00).');
  }

  if (msgs.length) return { error: msgs.join(' ') };
  return {
    servicesCatalog,
    amenities,
    operatingHours: { summary: hoursSummary },
  };
}

function pickPayload(body) {
  return {
    name: body.name,
    description: body.description,
    logoUrl: body.logoUrl,
    coverImageUrl: body.coverImageUrl,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2,
    city: body.city,
    region: body.region,
    postalCode: body.postalCode,
    country: body.country,
    latitude: body.latitude,
    longitude: body.longitude,
    publicPhone: body.publicPhone,
    publicEmail: body.publicEmail,
    websiteUrl: body.websiteUrl,
    operatingHours: body.operatingHours,
    servicesCatalog: body.servicesCatalog,
    staffHighlights: body.staffHighlights,
    socialLinks: body.socialLinks,
    amenities: body.amenities,
    galleryImages: body.galleryImages,
    videoUrls: body.videoUrls,
    registrationNumber: body.registrationNumber,
    taxId: body.taxId,
    province: body.province,
    district: body.district,
  };
}

const TENANT_LOCKED = new Set([
  'id',
  'listingStatus',
  'slug',
  'reviewedAt',
  'reviewedByUserId',
  'adminReviewNotes',
  'submittedByUserId',
  'createdAt',
  'updatedAt',
]);

/** Fields salon desk users may change on their own approved listing (everything else is stripped). */
const TENANT_PATCHABLE = new Set([
  'name',
  'description',
  'logoUrl',
  'coverImageUrl',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'country',
  'latitude',
  'longitude',
  'publicPhone',
  'publicEmail',
  'websiteUrl',
  'operatingHours',
  'servicesCatalog',
  'staffHighlights',
  'socialLinks',
  'amenities',
  'galleryImages',
  'videoUrls',
  'registrationNumber',
  'taxId',
  'province',
  'district',
]);

const apply = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!String(b.name || '').trim() || !String(b.description || '').trim()) {
      return sendBadRequest(res, 'Salon name and description are required.');
    }
    if (!String(b.addressLine1 || '').trim() || !String(b.city || '').trim()) {
      return sendBadRequest(res, 'Address line 1 and city are required.');
    }
    const extra = validateAndNormalizeApplication(b);
    if (extra.error) {
      return sendBadRequest(res, extra.error);
    }
    const payload = pickPayload(b);
    payload.servicesCatalog = extra.servicesCatalog;
    payload.amenities = extra.amenities;
    payload.operatingHours = extra.operatingHours;
    const row = await marketplaceSalonService.submitApplication(payload, req.user.id);
    return sendCreated(res, row, 'Application submitted for review.');
  } catch (error) {
    next(error);
  }
};

const mine = async (req, res, next) => {
  try {
    const rows = await marketplaceSalonService.listMine(req.user.id);
    return sendSuccess(res, rows, 'Your salon applications');
  } catch (error) {
    next(error);
  }
};

const getTenantListing = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await MarketplaceSalon.findByPk(salonId);
    if (!row) return sendNotFound(res, 'No marketplace profile is linked to this salon yet.');
    return sendSuccess(res, row, 'Your listing');
  } catch (error) {
    next(error);
  }
};

const patchTenantListing = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await MarketplaceSalon.findByPk(salonId);
    if (!row) return sendNotFound(res, 'No marketplace profile is linked to this salon yet.');
    const raw = { ...(req.body || {}) };
    for (const k of TENANT_LOCKED) delete raw[k];
    const patch = {};
    for (const k of Object.keys(raw)) {
      if (TENANT_PATCHABLE.has(k)) patch[k] = raw[k];
    }
    if (Object.keys(patch).length === 0) {
      return sendBadRequest(res, 'No allowed fields to update. You can edit your public profile, contact, hours, gallery, and story — not slug or moderation status.');
    }
    await row.update(patch);
    return sendSuccess(res, row, 'Listing updated');
  } catch (error) {
    next(error);
  }
};

export { apply, mine, getTenantListing, patchTenantListing };
