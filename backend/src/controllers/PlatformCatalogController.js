import { PlatformServiceCategory, PlatformHomeBanner } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';

const listCategories = async (req, res, next) => {
  try {
    const rows = await PlatformServiceCategory.findAll({ order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
    return sendSuccess(res, rows, 'Categories');
  } catch (e) {
    next(e);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, slug, iconUrl, sortOrder } = req.body || {};
    if (!String(name || '').trim() || !String(slug || '').trim()) {
      return sendBadRequest(res, 'name and slug are required');
    }
    const row = await PlatformServiceCategory.create({
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase(),
      iconUrl: iconUrl || null,
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    });
    return sendCreated(res, row, 'Category created');
  } catch (e) {
    next(e);
  }
};

function pickCategoryPatch(body) {
  const b = body || {};
  const out = {};
  if (Object.prototype.hasOwnProperty.call(b, 'name')) out.name = String(b.name ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(b, 'slug')) out.slug = String(b.slug ?? '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(b, 'iconUrl')) out.iconUrl = b.iconUrl ? String(b.iconUrl).trim() : null;
  if (Object.prototype.hasOwnProperty.call(b, 'sortOrder')) {
    const n = Number(b.sortOrder);
    if (!Number.isFinite(n)) return { error: 'sortOrder must be a number' };
    out.sortOrder = Math.trunc(n);
  }
  return { patch: out };
}

const patchCategory = async (req, res, next) => {
  try {
    const row = await PlatformServiceCategory.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    const { patch, error } = pickCategoryPatch(req.body);
    if (error) return sendBadRequest(res, error);
    if (Object.keys(patch).length === 0) return sendBadRequest(res, 'No allowed fields to update');
    await row.update(patch);
    return sendSuccess(res, row, 'Updated');
  } catch (e) {
    next(e);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const row = await PlatformServiceCategory.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    await row.destroy();
    return sendSuccess(res, null, 'Deleted');
  } catch (e) {
    next(e);
  }
};

const listBanners = async (req, res, next) => {
  try {
    const rows = await PlatformHomeBanner.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    return sendSuccess(res, rows, 'Banners');
  } catch (e) {
    next(e);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!String(b.title || '').trim() || !String(b.imageUrl || '').trim()) {
      return sendBadRequest(res, 'title and imageUrl are required');
    }
    const row = await PlatformHomeBanner.create({
      title: String(b.title).trim(),
      imageUrl: String(b.imageUrl).trim(),
      linkUrl: b.linkUrl || null,
      isActive: b.isActive !== false,
      sortOrder: b.sortOrder != null ? Number(b.sortOrder) : 0,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
    });
    return sendCreated(res, row, 'Banner created');
  } catch (e) {
    next(e);
  }
};

function pickBannerPatch(body) {
  const b = body || {};
  const out = {};
  if (Object.prototype.hasOwnProperty.call(b, 'title')) out.title = String(b.title ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(b, 'imageUrl')) out.imageUrl = String(b.imageUrl ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(b, 'linkUrl')) out.linkUrl = b.linkUrl ? String(b.linkUrl).trim() : null;
  if (Object.prototype.hasOwnProperty.call(b, 'isActive')) out.isActive = Boolean(b.isActive);
  if (Object.prototype.hasOwnProperty.call(b, 'sortOrder')) {
    const n = Number(b.sortOrder);
    if (!Number.isFinite(n)) return { error: 'sortOrder must be a number' };
    out.sortOrder = Math.trunc(n);
  }
  if (Object.prototype.hasOwnProperty.call(b, 'startsAt')) {
    out.startsAt = b.startsAt ? new Date(b.startsAt) : null;
    if (out.startsAt && Number.isNaN(out.startsAt.getTime())) return { error: 'Invalid startsAt' };
  }
  if (Object.prototype.hasOwnProperty.call(b, 'endsAt')) {
    out.endsAt = b.endsAt ? new Date(b.endsAt) : null;
    if (out.endsAt && Number.isNaN(out.endsAt.getTime())) return { error: 'Invalid endsAt' };
  }
  return { patch: out };
}

const patchBanner = async (req, res, next) => {
  try {
    const row = await PlatformHomeBanner.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    const { patch, error } = pickBannerPatch(req.body);
    if (error) return sendBadRequest(res, error);
    if (Object.keys(patch).length === 0) return sendBadRequest(res, 'No allowed fields to update');
    await row.update(patch);
    return sendSuccess(res, row, 'Updated');
  } catch (e) {
    next(e);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const row = await PlatformHomeBanner.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    await row.destroy();
    return sendSuccess(res, null, 'Deleted');
  } catch (e) {
    next(e);
  }
};

export {
  listCategories,
  createCategory,
  patchCategory,
  deleteCategory,
  listBanners,
  createBanner,
  patchBanner,
  deleteBanner,
};
