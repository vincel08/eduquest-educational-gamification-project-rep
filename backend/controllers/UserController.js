import UserService from '../services/UserService.js';
import { successResponse } from '../utils/apiResponse.js';

const UserController = {
  async list(req, res, next) {
    try {
      const data = await UserService.listUsers(req.query);
      return successResponse(res, 'Users retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await UserService.getUserById(Number(req.params.id));
      return successResponse(res, 'User retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const data = await UserService.createUser(req.body);
      return successResponse(res, 'User created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await UserService.updateUser(Number(req.params.id), req.body);
      return successResponse(res, 'User updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await UserService.deleteUser(Number(req.params.id));
      return successResponse(res, 'User deleted', {});
    } catch (error) {
      return next(error);
    }
  },
};

export default UserController;
