import api, { AI_REQUEST_TIMEOUT_MS } from "./api";

const quizService = {
  create(payload) {
    return api.post("/quizzes", payload);
  },
  generate(payload) {
    return api.post("/quizzes/generate", payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  listMine(params) {
    return api.get("/quizzes/mine", { params });
  },
  copy(id, payload) {
    return api.post(`/quizzes/${id}/copy`, payload);
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
  releaseGrade(quizId) {
    return api.post(`/quizzes/${quizId}/release-grade`);
  },
  myAttempts(params) {
    return api.get("/quizzes/attempts/mine", { params });
  },
  attemptReview(quizId, attemptId) {
    return api.get(`/quizzes/${quizId}/attempts/${attemptId}`);
  },
  listOverrides(quizId) {
    return api.get(`/quizzes/${quizId}/overrides`);
  },
  grantOverride(quizId, payload) {
    return api.post(`/quizzes/${quizId}/overrides`, payload);
  },
  removeOverride(quizId, studentId) {
    return api.delete(`/quizzes/${quizId}/overrides/${studentId}`);
  },
  hint(payload) {
    return api.post("/quizzes/hints", payload);
  },
  attachImage(questionId, file) {
    const formData = new FormData();
    formData.append("image", file);
    return api.post(`/quizzes/questions/${questionId}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default quizService;
