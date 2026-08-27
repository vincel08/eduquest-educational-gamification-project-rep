import api from './api';

const activityLogService = {
  list(params = {}) {
    return api.get('/activity-logs', { params });
  },
};

export default activityLogService;
