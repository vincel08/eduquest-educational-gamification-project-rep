import api from './api';

const authService = {
  register(payload) {
    return api.post('/auth/register', payload);
  },
  login(payload) {
    return api.post('/auth/login', payload);
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
