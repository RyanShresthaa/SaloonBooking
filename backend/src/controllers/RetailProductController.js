import retailProductService from '../services/RetailProductService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const listRetail = async (req, res, next) => {
  try {
    const rows = await retailProductService.list(req.user.role);
    return sendSuccess(res, rows, 'Products retrieved');
  } catch (error) {
    next(error);
  }
};

const createRetail = async (req, res, next) => {
  try {
    const row = await retailProductService.create(req.body);
    return sendCreated(res, row, 'Product created');
  } catch (error) {
    next(error);
  }
};

const updateRetail = async (req, res, next) => {
  try {
    const row = await retailProductService.update(req.params.id, req.body);
    return sendSuccess(res, row, 'Product updated');
  } catch (error) {
    next(error);
  }
};

const deleteRetail = async (req, res, next) => {
  try {
    const result = await retailProductService.remove(req.params.id);
    return sendSuccess(res, result, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

export { listRetail, createRetail, updateRetail, deleteRetail };
