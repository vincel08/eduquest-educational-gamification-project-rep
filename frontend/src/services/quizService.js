import api from './api';

const quizService = {
  create(payload) {
    return api.post('/quizzes', payload);
  },
  generate(payload) {
    return api.post('/quizzes/generate', payload);
  },
  getById(id) {
    return api.get(`/quizzes/${id}`);
  },
  update(id, payload) {
    return api.put(`/quizzes/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/quizzes/${id}`);
  },
  start(id) {
    return api.post(`/quizzes/${id}/start`);
  },
  submit(attemptId, answers) {
    return api.post(`/quizzes/attempts/${attemptId}/submit`, { answers });
  },
  myAttempts(params) {
    return api.get('/quizzes/attempts/mine', { params });
  },
  hint(payload) {
    return api.post('/quizzes/hints', payload);
  },
  attachImage(questionId, file) {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/quizzes/questions/${questionId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default quizService;
