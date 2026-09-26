import api from "./api";

const courseService = {
  list(params) {
    return api.get("/courses", { params });
  },
  getById(id) {
    return api.get(`/courses/${id}`);
  },
  create(payload) {
    return api.post("/courses", payload);
  },
  update(id, payload) {
    return api.put(`/courses/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/courses/${id}`);
  },
  requestJoin(courseId, code) {
    return api.post(`/courses/${courseId}/join`, { code });
  },
  myJoinRequests() {
    return api.get("/courses/join-requests/mine");
  },
  joinRequests(courseId) {
    return api.get(`/courses/${courseId}/join-requests`);
  },
  approveJoinRequest(courseId, requestId) {
    return api.post(`/courses/${courseId}/join-requests/${requestId}/approve`);
  },
  rejectJoinRequest(courseId, requestId) {
    return api.post(`/courses/${courseId}/join-requests/${requestId}/reject`);
  },
  myCourses() {
    return api.get("/courses/mine/enrolled");
  },
  enrollments(id, params) {
    return api.get(`/courses/${id}/enrollments`, { params });
  },
  removeStudent(courseId, studentId) {
    return api.delete(`/courses/${courseId}/enrollments/${studentId}`);
  },
  gradebook(id, params) {
    return api.get(`/courses/${id}/gradebook`, { params });
  },
  teacherSections(params) {
    return api.get("/courses/teacher/sections", { params });
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
