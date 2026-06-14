import { RetailProduct } from '../models/Index.js';

class RetailProductService {
  /**
   * @param {string} role - JWT role
   * @param {string|null} salonId - Staff/admin: their salon. Customers: resolved tenant (query or default).
   */
  async list(role, salonId = null) {
    const roleNorm = String(role || '').toLowerCase();
    const isDesk = roleNorm === 'admin' || roleNorm === 'staff';

    if (!salonId) {
      const error = new Error('Salon context required');
      error.statusCode = 400;
      throw error;
    }

    if (!isDesk) {
      return RetailProduct.findAll({
        where: { salonId, isActive: true },
        order: [['name', 'ASC']],
      });
    }

    return RetailProduct.findAll({
      where: { salonId },
      order: [['name', 'ASC']],
    });
  }

  async create(data, salonId) {
    return RetailProduct.create({
      name: data.name,
      description: data.description || null,
      price: data.price,
      stockQty: data.stockQty ?? 0,
      isActive: data.isActive !== false,
      salonId,
    });
  }

  async update(id, data, salonId) {
    const row = await RetailProduct.findByPk(id);
    if (!row || String(row.salonId) !== String(salonId)) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.price !== undefined) patch.price = data.price;
    if (data.stockQty !== undefined) patch.stockQty = data.stockQty;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    await row.update(patch);
    return row.reload();
  }

  async remove(id, salonId) {
    const row = await RetailProduct.findByPk(id);
    if (!row || String(row.salonId) !== String(salonId)) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    await row.destroy();
    return { id };
  }
}

export default new RetailProductService();
