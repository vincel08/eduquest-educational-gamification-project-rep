import api from './api';

const userService = {
  list(params) {
    return api.get('/users', { params });
  },
  getById(id) {
    return api.get(`/users/${id}`);
  },
  create(payload) {
    return api.post('/users', payload);
  },
  update(id, payload) {
    return api.put(`/users/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/users/${id}`);
  },
};

export default userService;
