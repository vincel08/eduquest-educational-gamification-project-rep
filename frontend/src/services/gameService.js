import api, { AI_REQUEST_TIMEOUT_MS } from './api';

const gameService = {
  listMine(params) {
    return api.get('/games/mine', { params });
  },
  copy(id, payload) {
    return api.post(`/games/${id}/copy`, payload);
  },
  create(payload) {
    return api.post('/games', payload);
  },
  generate(payload) {
    return api.post('/games/generate', payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
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
  releaseGrade(id) {
    return api.post(`/games/${id}/release-grade`);
  },
  myScores(params) {
    return api.get('/games/scores/mine', { params });
  },
  scoreReview(gameId, scoreId) {
    return api.get(`/games/${gameId}/scores/${scoreId}`);
  },
  listOverrides(gameId) {
    return api.get(`/games/${gameId}/overrides`);
  },
  grantOverride(gameId, payload) {
    return api.post(`/games/${gameId}/overrides`, payload);
  },
  removeOverride(gameId, studentId) {
    return api.delete(`/games/${gameId}/overrides/${studentId}`);
  },
};

export default gameService;
