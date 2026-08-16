import AuthService from '../services/AuthService.js';
import { successResponse } from '../utils/apiResponse.js';

const AuthController = {
  async register(req, res, next) {
    try {
      const data = await AuthService.register(req.body);
      return successResponse(res, 'Registration successful', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async login(req, res, next) {
    try {
      const data = await AuthService.login(req.body);
      return successResponse(res, 'Login successful', data);
    } catch (error) {
      return next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const data = await AuthService.updateProfile(req.user.id, req.body);
      return successResponse(res, 'Profile updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async uploadAvatar(req, res, next) {
    try {
      const data = await AuthService.uploadAvatar(req.user.id, req.file);
      return successResponse(res, 'Profile picture updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async removeAvatar(req, res, next) {
    try {
      const data = await AuthService.removeAvatar(req.user.id);
      return successResponse(res, 'Profile picture removed', data);
    } catch (error) {
      return next(error);
    }
  },

  async me(req, res, next) {
    try {
      const data = await AuthService.getMe(req.user.id);
      return successResponse(res, 'Profile retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const data = await AuthService.requestPasswordReset(req.body);
      return successResponse(res, data.message, {
        eligible: data.eligible,
        reason: data.reason,
      });
    } catch (error) {
      return next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const data = await AuthService.resetPassword(req.body);
      return successResponse(res, data.message, {});
    } catch (error) {
      return next(error);
    }
  },
};

export default AuthController;
