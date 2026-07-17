import api from './api';

const aiContentService = {
  extract(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai-content/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generate(payload) {
    return api.post('/ai-content/generate', payload);
  },
  save(payload) {
    return api.post('/ai-content/save', payload);
  },
};

export default aiContentService;
