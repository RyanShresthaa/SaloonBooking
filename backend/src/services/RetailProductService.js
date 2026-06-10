import { RetailProduct } from '../models/Index.js';

class RetailProductService {
  async list(role) {
    const salonWide = role === 'admin' || role === 'staff';
    const where = salonWide ? {} : { isActive: true };
    return RetailProduct.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }

  async create(data) {
    return RetailProduct.create({
      name: data.name,
      description: data.description || null,
      price: data.price,
      stockQty: data.stockQty ?? 0,
      isActive: data.isActive !== false,
    });
  }

  async update(id, data) {
    const row = await RetailProduct.findByPk(id);
    if (!row) {
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

  async remove(id) {
    const row = await RetailProduct.findByPk(id);
    if (!row) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    await row.destroy();
    return { id };
  }
}

export default new RetailProductService();
