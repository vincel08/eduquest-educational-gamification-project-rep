import api from './api';

const authService = {
  register(payload) {
    return api.post('/auth/register', payload);
  },
  login(payload) {
    const identifier = String(payload.login || payload.username || payload.email || '').trim();
    const body = {
      password: payload.password,
      login: identifier,
    };
    if (identifier.includes('@')) {
      body.email = identifier;
    } else if (identifier) {
      body.username = identifier;
    }
    return api.post('/auth/login', body);
  },
  forgotPassword(payload) {
    return api.post('/auth/forgot-password', payload);
  },
  resetPassword(payload) {
    return api.post('/auth/reset-password', payload);
  },
  me() {
    return api.get('/auth/me');
  },
  updateProfile(payload) {
    return api.put('/auth/profile', payload);
  },
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar() {
    return api.delete('/auth/avatar');
  },
};

export default authService;
