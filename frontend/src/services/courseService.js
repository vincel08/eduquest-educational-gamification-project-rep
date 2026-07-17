import api from './api';

const courseService = {
  list(params) {
    return api.get('/courses', { params });
  },
  getById(id) {
    return api.get(`/courses/${id}`);
  },
  create(payload) {
    return api.post('/courses', payload);
  },
  update(id, payload) {
    return api.put(`/courses/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/courses/${id}`);
  },
  enroll(id) {
    return api.post(`/courses/${id}/enroll`);
  },
  myCourses() {
    return api.get('/courses/mine/enrolled');
  },
  enrollments(id) {
    return api.get(`/courses/${id}/enrollments`);
  },
  lessons(courseId) {
    return api.get(`/courses/${courseId}/lessons`);
  },
  quizzes(courseId) {
    return api.get(`/courses/${courseId}/quizzes`);
  },
  games(courseId) {
    return api.get(`/courses/${courseId}/games`);
  },
};

export default courseService;
