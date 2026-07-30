import api from './api';

const aiReviewService = {
  list(params) {
    return api.get('/ai-review/drafts', { params });
  },
  getById(id) {
    return api.get(`/ai-review/drafts/${id}`);
  },
  createFromQuiz(payload) {
    return api.post('/ai-review/from-quiz', payload);
  },
  createFromGame(payload) {
    return api.post('/ai-review/from-game', payload);
  },
  createFromContent(payload) {
    return api.post('/ai-review/from-content', payload);
  },
  update(id, payload) {
    return api.put(`/ai-review/drafts/${id}`, payload);
  },
  saveDraft(id, payload) {
    return api.post(`/ai-review/drafts/${id}/save-draft`, payload);
  },
  publish(id, payload) {
    return api.post(`/ai-review/drafts/${id}/publish`, payload);
  },
  discard(id) {
    return api.delete(`/ai-review/drafts/${id}`);
  },
  regenerate(id, payload) {
    return api.post(`/ai-review/drafts/${id}/regenerate`, payload);
  },
  transform(id, payload) {
    return api.post(`/ai-review/drafts/${id}/transform`, payload);
  },
};

export default aiReviewService;
