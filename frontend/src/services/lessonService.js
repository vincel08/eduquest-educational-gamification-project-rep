import api from './api';

const lessonService = {
  getById(id) {
    return api.get(`/lessons/${id}`);
  },
  create(courseId, payload) {
    return api.post(`/courses/${courseId}/lessons`, payload);
  },
  update(id, payload) {
    return api.put(`/lessons/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/lessons/${id}`);
  },
  complete(id) {
    return api.post(`/lessons/${id}/complete`);
  },
  uploadMaterial(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/lessons/${id}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMaterial(materialId) {
    return api.delete(`/lessons/materials/${materialId}`);
  },
};

export default lessonService;
