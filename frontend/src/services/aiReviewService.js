import api, { AI_REQUEST_TIMEOUT_MS } from './api';

const aiReviewService = {
  list(params) {
    return api.get('/ai-review/drafts', { params });
  },
  getById(id) {
    return api.get(`/ai-review/drafts/${id}`);
  },
  createFromQuiz(payload) {
    return api.post('/ai-review/from-quiz', payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  createFromGame(payload) {
    return api.post('/ai-review/from-game', payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  createFromContent(payload) {
    return api.post('/ai-review/from-content', payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
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
    return api.post(`/ai-review/drafts/${id}/regenerate`, payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  transform(id, payload) {
    return api.post(`/ai-review/drafts/${id}/transform`, payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
};

export default aiReviewService;
