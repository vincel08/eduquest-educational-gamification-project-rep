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
};

export default authService;
