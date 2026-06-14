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

const patchCategory = async (req, res, next) => {
  try {
    const row = await PlatformServiceCategory.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    await row.update(req.body || {});
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

const patchBanner = async (req, res, next) => {
  try {
    const row = await PlatformHomeBanner.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Not found');
    await row.update(req.body || {});
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
