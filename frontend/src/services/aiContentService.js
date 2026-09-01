import api, { AI_REQUEST_TIMEOUT_MS } from './api';

const aiContentService = {
  extract(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai-content/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  generate(payload) {
    return api.post('/ai-content/generate', payload, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  },
  save(payload) {
    return api.post('/ai-content/save', payload);
  },
};

export default aiContentService;
