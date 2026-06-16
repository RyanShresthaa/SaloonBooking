import { Op, Sequelize } from 'sequelize';
import {
  sequelize,
  MarketplaceSalon,
  SalonResource,
  Service,
  SalonReview,
  User,
  Appointment,
  WaitlistEntry,
  VisitFeedback,
  NotificationLog,
  RetailProduct,
  NotificationTemplate,
  StaffTimeOff,
  CustomerFavorite,
  PromoCode,
} from '../models/Index.js';
import { slugifyBase } from '../utils/slugify.js';

/** Old bookmarks / typos → current canonical slug (approved listing must exist under canonical). */
const PUBLIC_SLUG_ALIASES = Object.freeze({
  'velvet-shear-studio-austin': 'velvet-shear-studio-kathmandu',
});

function resolvePublicMarketplaceSlug(slug) {
  const raw = String(slug || '').trim();
  if (!raw) return raw;
  return PUBLIC_SLUG_ALIASES[raw] || raw;
}

function catalogMinMaxPrice(servicesCatalog) {
  const catalog = Array.isArray(servicesCatalog) ? servicesCatalog : [];
  const prices = catalog.map((s) => Number(s?.price)).filter((p) => !Number.isNaN(p) && p >= 0);
  if (!prices.length) return { min: null, max: null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function matchesPriceRange(row, minP, maxP) {
  if (minP == null && maxP == null) return true;
  const { min, max } = catalogMinMaxPrice(row.servicesCatalog);
  if (min == null) return false;
  if (minP != null && max < minP) return false;
  if (maxP != null && min > maxP) return false;
  return true;
}

class MarketplaceSalonService {
  async submitApplication(payload, submittedByUserId) {
    return MarketplaceSalon.create({
      ...payload,
      listingStatus: 'pending',
      slug: null,
      submittedByUserId: submittedByUserId || null,
    });
  }

  async listMine(userId) {
    return MarketplaceSalon.findAll({
      where: { submittedByUserId: userId },
      order: [['updatedAt', 'DESC']],
    });
  }

  async listAdmin({ status, city, q, limit = 50, offset = 0, tenantScope = null }) {
    const parts = [];
    if (tenantScope && tenantScope.role !== 'super_admin') {
      const or = [];
      if (tenantScope.salonId) or.push({ id: tenantScope.salonId });
      if (tenantScope.id) or.push({ submittedByUserId: tenantScope.id });
      if (or.length) parts.push({ [Op.or]: or });
      else parts.push({ id: { [Op.in]: [] } });
    }
    if (status) parts.push({ listingStatus: status });
    if (city) parts.push({ city: { [Op.iLike]: `%${city}%` } });
    if (q) {
      parts.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
        ],
      });
    }
    const where = parts.length > 1 ? { [Op.and]: parts } : parts[0] || {};
    return MarketplaceSalon.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0,
    });
  }

  async getByIdForAdmin(id) {
    return MarketplaceSalon.findByPk(id);
  }

  async createManual(payload, actorUserId) {
    const status = payload.listingStatus || 'approved';
    let slug = payload.slug?.trim() || null;
    if (status === 'approved') {
      slug = slug || slugifyBase(payload.name) || `salon-${Date.now()}`;
      let n = 0;
      let candidate = slug;
      // eslint-disable-next-line no-await-in-loop
      while (await MarketplaceSalon.findOne({ where: { slug: candidate } })) {
        n += 1;
        candidate = `${slug}-${n}`;
      }
      slug = candidate;
    }
    const row = await MarketplaceSalon.create({
      name: payload.name,
      description: payload.description,
      logoUrl: payload.logoUrl ?? null,
      coverImageUrl: payload.coverImageUrl ?? null,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? null,
      city: payload.city,
      region: payload.region ?? null,
      postalCode: payload.postalCode ?? null,
      country: payload.country || 'US',
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      publicPhone: payload.publicPhone ?? null,
      publicEmail: payload.publicEmail ?? null,
      websiteUrl: payload.websiteUrl ?? null,
      operatingHours: payload.operatingHours || {},
      servicesCatalog: payload.servicesCatalog || [],
      staffHighlights: payload.staffHighlights || [],
      socialLinks: payload.socialLinks || {},
      amenities: payload.amenities || [],
      submittedByUserId: null,
      listingStatus: status,
      adminReviewNotes: payload.adminReviewNotes ?? null,
      reviewedByUserId: status === 'approved' ? actorUserId : null,
      reviewedAt: status === 'approved' ? new Date() : null,
      slug: status === 'approved' ? slug : null,
    });
    if (status === 'approved') await this._provisionIfNeeded(row.id);
    return row;
  }

  /**
   * Remove a marketplace row and all tenant-scoped operational data that FK-restricts deletion.
   * (DB uses ON DELETE RESTRICT on services, appointments, resources, etc.)
   */
  async deleteListing(id) {
    const salonId = String(id || '').trim();
    const row = await MarketplaceSalon.findByPk(salonId);
    if (!row) {
      const e = new Error('Listing not found');
      e.statusCode = 404;
      throw e;
    }
    const t = await sequelize.transaction();
    try {
      const sidWhere = { salonId };

      const appointments = await Appointment.findAll({
        where: sidWhere,
        attributes: ['id'],
        transaction: t,
      });
      const appointmentIds = appointments.map((a) => a.id);
      if (appointmentIds.length) {
        await VisitFeedback.destroy({ where: { appointmentId: { [Op.in]: appointmentIds } }, transaction: t });
        await NotificationLog.destroy({ where: { appointmentId: { [Op.in]: appointmentIds } }, transaction: t });
      }
      await Appointment.destroy({ where: sidWhere, transaction: t });
      await WaitlistEntry.destroy({ where: sidWhere, transaction: t });
      await StaffTimeOff.destroy({ where: sidWhere, transaction: t });
      await Service.destroy({ where: sidWhere, transaction: t });

      const templates = await NotificationTemplate.findAll({
        where: sidWhere,
        attributes: ['id'],
        transaction: t,
      });
      const templateIds = templates.map((x) => x.id);
      if (templateIds.length) {
        await NotificationLog.destroy({ where: { templateId: { [Op.in]: templateIds } }, transaction: t });
      }
      await NotificationTemplate.destroy({ where: sidWhere, transaction: t });
      await RetailProduct.destroy({ where: sidWhere, transaction: t });

      await SalonReview.destroy({ where: { marketplaceSalonId: salonId }, transaction: t });
      await CustomerFavorite.destroy({ where: { marketplaceSalonId: salonId }, transaction: t });
      await PromoCode.destroy({ where: sidWhere, transaction: t });

      await SalonResource.destroy({ where: sidWhere, transaction: t });

      await row.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async moderate({ id, actorUserId, listingStatus, adminReviewNotes, slug }) {
    const row = await MarketplaceSalon.findByPk(id);
    if (!row) {
      const e = new Error('Listing not found');
      e.statusCode = 404;
      throw e;
    }
    const patch = {
      listingStatus,
      adminReviewNotes: adminReviewNotes ?? null,
      reviewedAt: new Date(),
      reviewedByUserId: actorUserId,
    };
    if (listingStatus === 'approved') {
      let nextSlug = slug?.trim() || slugifyBase(row.name) || `salon-${String(row.id).slice(0, 8)}`;
      let n = 0;
      // eslint-disable-next-line no-await-in-loop
      while (await MarketplaceSalon.findOne({ where: { slug: nextSlug, id: { [Op.ne]: id } } })) {
        n += 1;
        nextSlug = `${slugifyBase(row.name) || 'salon'}-${n}`;
      }
      patch.slug = nextSlug;
      await row.update(patch);
      await this._provisionIfNeeded(row.id);
      await this._linkSubmitterAsSalonOwner(row);
    } else {
      if (listingStatus !== 'approved') {
        patch.slug = null;
      }
      await row.update(patch);
    }
    return row.reload();
  }

  async _provisionIfNeeded(salonId) {
    const count = await SalonResource.count({ where: { salonId } });
    if (count === 0) {
      await SalonResource.create({ name: 'Station 1', salonId, isActive: true });
    }
  }

  /**
   * Listing id doubles as operational tenant salonId. Applicant must become desk admin to see owner UI.
   * Skips when no submitter or submitter is platform super_admin.
   */
  async _linkSubmitterAsSalonOwner(marketplaceSalonRow) {
    const uid = marketplaceSalonRow.submittedByUserId;
    if (!uid) return;
    const user = await User.findByPk(uid, { attributes: ['id', 'role'] });
    if (!user) return;
    if (String(user.role || '').toLowerCase() === 'super_admin') return;
    await user.update({
      role: 'admin',
      salonId: marketplaceSalonRow.id,
    });
  }

  async _salonIdsMatchingLiveServices({ serviceQ, platformCategoryId }) {
    const sw = { isActive: true };
    const sq = String(serviceQ || '').trim();
    const cat = String(platformCategoryId || '').trim();
    if (sq) sw.name = { [Op.iLike]: `%${sq}%` };
    if (cat) sw.platformCategoryId = cat;
    const hits = await Service.findAll({
      attributes: ['salonId'],
      where: sw,
      group: ['salonId'],
      raw: true,
    });
    return [...new Set(hits.map((h) => String(h.salonId)).filter(Boolean))];
  }

  async _reviewStatsBySalonIds(salonIds) {
    const ids = [...new Set((salonIds || []).map((id) => String(id)).filter(Boolean))];
    const map = new Map();
    if (!ids.length) return map;
    const rows = await SalonReview.findAll({
      attributes: [
        'marketplaceSalonId',
        [Sequelize.fn('AVG', Sequelize.cast(Sequelize.col('rating'), 'DOUBLE PRECISION')), 'avgRating'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'reviewCount'],
      ],
      where: { status: 'published', marketplaceSalonId: { [Op.in]: ids } },
      group: ['marketplaceSalonId'],
      raw: true,
    });
    for (const r of rows) {
      const sid = String(r.marketplaceSalonId);
      map.set(sid, {
        avgRating: r.avgRating != null ? Number(r.avgRating) : null,
        reviewCount: Number(r.reviewCount) || 0,
      });
    }
    return map;
  }

  async listPublicApproved({
    city,
    region,
    q,
    minPrice,
    maxPrice,
    serviceQ,
    platformCategoryId,
    minRating,
    limit = 24,
    offset = 0,
    sort = 'name',
  }) {
    const where = { listingStatus: 'approved', suspendedAt: { [Op.is]: null } };
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (region) where.region = { [Op.iLike]: `%${region}%` };
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const hasServiceFilter = Boolean(String(serviceQ || '').trim()) || Boolean(String(platformCategoryId || '').trim());
    if (hasServiceFilter) {
      const salonIds = await this._salonIdsMatchingLiveServices({ serviceQ, platformCategoryId });
      if (!salonIds.length) return { rows: [], count: 0 };
      where.id = { [Op.in]: salonIds };
    }

    const lim = Math.min(Number(limit) || 24, 100);
    const off = Number(offset) || 0;
    const minP = minPrice != null && String(minPrice).trim() !== '' ? Number(minPrice) : null;
    const maxP = maxPrice != null && String(maxPrice).trim() !== '' ? Number(maxPrice) : null;
    const minRRaw = minRating != null && String(minRating).trim() !== '' ? Number(minRating) : null;
    const minR = minRRaw != null && !Number.isNaN(minRRaw) ? minRRaw : null;

    const sortNorm = String(sort || 'name').toLowerCase();
    const needsMemory =
      minP != null ||
      maxP != null ||
      minR != null ||
      ['price_asc', 'price_desc', 'rating', 'reviews', 'popularity'].includes(sortNorm);

    const dbOrder =
      sortNorm === 'featured'
        ? [
            ['featuredRank', 'DESC'],
            ['name', 'ASC'],
          ]
        : sortNorm === 'sponsored'
          ? [
              ['sponsoredRank', 'DESC'],
              ['name', 'ASC'],
            ]
          : [['name', 'ASC']];

    const attachReviews = async (plainRows) => {
      const stats = await this._reviewStatsBySalonIds(plainRows.map((p) => p.id));
      return plainRows.map((p) => {
        const st = stats.get(String(p.id)) || { avgRating: null, reviewCount: 0 };
        return { ...p, avgRating: st.avgRating, reviewCount: st.reviewCount };
      });
    };

    if (!needsMemory) {
      const { rows, count } = await MarketplaceSalon.findAndCountAll({
        where,
        order: dbOrder,
        limit: lim,
        offset: off,
      });
      const plain = rows.map((r) => r.get({ plain: true }));
      const enriched = await attachReviews(plain);
      return { rows: enriched, count };
    }

    const candidates = await MarketplaceSalon.findAll({
      where,
      order: dbOrder,
      limit: 500,
    });
    let plain = candidates.map((r) => r.get({ plain: true })).filter((r) => matchesPriceRange(r, minP, maxP));
    let enriched = await attachReviews(plain);

    if (minR != null) {
      enriched = enriched.filter((r) => (r.avgRating ?? 0) >= minR);
    }

    const cmpName = (a, b) => String(a.name).localeCompare(String(b.name));

    if (sortNorm === 'price_asc') {
      enriched.sort((a, b) => {
        const pa = catalogMinMaxPrice(a.servicesCatalog).min;
        const pb = catalogMinMaxPrice(b.servicesCatalog).min;
        const na = pa == null ? Number.POSITIVE_INFINITY : pa;
        const nb = pb == null ? Number.POSITIVE_INFINITY : pb;
        if (na !== nb) return na - nb;
        return cmpName(a, b);
      });
    } else if (sortNorm === 'price_desc') {
      enriched.sort((a, b) => {
        const pa = catalogMinMaxPrice(a.servicesCatalog).max ?? catalogMinMaxPrice(a.servicesCatalog).min;
        const pb = catalogMinMaxPrice(b.servicesCatalog).max ?? catalogMinMaxPrice(b.servicesCatalog).min;
        const na = pa == null ? Number.NEGATIVE_INFINITY : pa;
        const nb = pb == null ? Number.NEGATIVE_INFINITY : pb;
        if (na !== nb) return nb - na;
        return cmpName(a, b);
      });
    } else if (sortNorm === 'rating') {
      enriched.sort((a, b) => {
        const ra = a.avgRating ?? -1;
        const rb = b.avgRating ?? -1;
        if (ra !== rb) return rb - ra;
        return cmpName(a, b);
      });
    } else if (sortNorm === 'reviews' || sortNorm === 'popularity') {
      enriched.sort((a, b) => {
        const ca = a.reviewCount ?? 0;
        const cb = b.reviewCount ?? 0;
        if (ca !== cb) return cb - ca;
        return cmpName(a, b);
      });
    } else if (sortNorm === 'featured') {
      enriched.sort((a, b) => {
        const fa = a.featuredRank ?? -1e9;
        const fb = b.featuredRank ?? -1e9;
        if (fa !== fb) return fb - fa;
        return cmpName(a, b);
      });
    } else if (sortNorm === 'sponsored') {
      enriched.sort((a, b) => {
        const sa = a.sponsoredRank ?? -1e9;
        const sb = b.sponsoredRank ?? -1e9;
        if (sa !== sb) return sb - sa;
        return cmpName(a, b);
      });
    } else {
      enriched.sort(cmpName);
    }

    const total = enriched.length;
    const slice = enriched.slice(off, off + lim);
    return { rows: slice, count: total };
  }

  async getPublicBySlug(slug) {
    const canonical = resolvePublicMarketplaceSlug(slug);
    return MarketplaceSalon.findOne({
      where: { slug: canonical, listingStatus: 'approved', suspendedAt: { [Op.is]: null } },
    });
  }

  /** Plain listing row + aggregate review stats (for public profile). */
  async getEnrichedPublicPlainBySlug(slug) {
    const row = await this.getPublicBySlug(slug);
    if (!row) return null;
    const plain = row.get({ plain: true });
    const stats = await this._reviewStatsBySalonIds([plain.id]);
    const st = stats.get(String(plain.id)) || { avgRating: null, reviewCount: 0 };
    return { ...plain, avgRating: st.avgRating, reviewCount: st.reviewCount };
  }

  toPublicCard(row) {
    if (!row) return null;
    const p = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    const { min, max } = catalogMinMaxPrice(p.servicesCatalog);
    const card = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      logoUrl: p.logoUrl,
      coverImageUrl: p.coverImageUrl,
      city: p.city,
      region: p.region,
      country: p.country,
      priceFrom: min,
      priceTo: max,
      verified: Boolean(p.verifiedAt),
      featuredRank: p.featuredRank ?? null,
      sponsoredRank: p.sponsoredRank ?? null,
    };
    if (p.avgRating != null && !Number.isNaN(Number(p.avgRating))) {
      card.avgRating = Math.round(Number(p.avgRating) * 10) / 10;
    }
    if (p.reviewCount != null) {
      card.reviewCount = Number(p.reviewCount) || 0;
    }
    return card;
  }

  toPublicDetail(row) {
    if (!row) return null;
    const p = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    const out = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      logoUrl: p.logoUrl,
      coverImageUrl: p.coverImageUrl,
      addressLine1: p.addressLine1,
      addressLine2: p.addressLine2,
      city: p.city,
      region: p.region,
      postalCode: p.postalCode,
      country: p.country,
      publicPhone: p.publicPhone,
      publicEmail: p.publicEmail,
      websiteUrl: p.websiteUrl,
      operatingHours: p.operatingHours,
      servicesCatalog: p.servicesCatalog,
      staffHighlights: p.staffHighlights,
      socialLinks: p.socialLinks,
      amenities: p.amenities,
      galleryImages: p.galleryImages || [],
      videoUrls: p.videoUrls || [],
      province: p.province,
      district: p.district,
      registrationNumber: p.registrationNumber,
      taxId: p.taxId,
      verifiedAt: p.verifiedAt,
      verified: Boolean(p.verifiedAt),
      featuredRank: p.featuredRank ?? null,
      sponsoredRank: p.sponsoredRank ?? null,
    };
    if (p.avgRating != null && !Number.isNaN(Number(p.avgRating))) {
      out.avgRating = Math.round(Number(p.avgRating) * 10) / 10;
    }
    if (p.reviewCount != null) {
      out.reviewCount = Number(p.reviewCount) || 0;
    }
    return out;
  }
}

export default new MarketplaceSalonService();
