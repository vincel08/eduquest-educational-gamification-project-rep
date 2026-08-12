import api from './api';

const quizService = {
  create(payload) {
    return api.post('/quizzes', payload);
  },
  generate(payload) {
    return api.post('/quizzes/generate', payload);
  },
  listMine() {
    return api.get('/quizzes/mine');
  },
  getById(id) {
    return api.get(`/quizzes/${id}`);
  },
  preview(id) {
    return api.get(`/quizzes/${id}/preview`);
  },
  update(id, payload) {
    return api.put(`/quizzes/${id}`, payload);
  },
  publish(id) {
    return api.post(`/quizzes/${id}/publish`);
  },
  unpublish(id) {
    return api.post(`/quizzes/${id}/unpublish`);
  },
  remove(id) {
    return api.delete(`/quizzes/${id}`);
  },
  addQuestion(quizId, payload) {
    return api.post(`/quizzes/${quizId}/questions`, payload);
  },
  updateQuestion(quizId, questionId, payload) {
    return api.put(`/quizzes/${quizId}/questions/${questionId}`, payload);
  },
  deleteQuestion(quizId, questionId) {
    return api.delete(`/quizzes/${quizId}/questions/${questionId}`);
  },
  replaceQuestions(quizId, questions) {
    return api.put(`/quizzes/${quizId}/questions`, { questions });
  },
  reorderQuestions(quizId, orderedIds) {
    return api.put(`/quizzes/${quizId}/questions/reorder`, { orderedIds });
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
