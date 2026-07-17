import api from './api';

const gameService = {
  create(payload) {
    return api.post('/games', payload);
  },
  generate(payload) {
    return api.post('/games/generate', payload);
  },
  getById(id) {
    return api.get(`/games/${id}`);
  },
  update(id, payload) {
    return api.put(`/games/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/games/${id}`);
  },
  submitScore(id, payload) {
    return api.post(`/games/${id}/scores`, payload);
  },
  myScores(params) {
    return api.get('/games/scores/mine', { params });
  },
};

export default gameService;
