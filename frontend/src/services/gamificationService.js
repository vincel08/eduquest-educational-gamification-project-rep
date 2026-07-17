import api from './api';

const gamificationService = {
  me() {
    return api.get('/gamification/me');
  },
  leaderboard(params) {
    return api.get('/gamification/leaderboard', { params });
  },
  badges() {
    return api.get('/gamification/badges');
  },
  createBadge(payload) {
    return api.post('/gamification/badges', payload);
  },
  updateBadge(id, payload) {
    return api.put(`/gamification/badges/${id}`, payload);
  },
  awardBadge(payload) {
    return api.post('/gamification/badges/award', payload);
  },
  medals() {
    return api.get('/gamification/medals');
  },
  createMedal(payload) {
    return api.post('/gamification/medals', payload);
  },
  awardMedal(payload) {
    return api.post('/gamification/medals/award', payload);
  },
  certificates() {
    return api.get('/gamification/certificates');
  },
  createCertificate(payload) {
    return api.post('/gamification/certificates', payload);
  },
  updateCertificate(id, payload) {
    return api.put(`/gamification/certificates/${id}`, payload);
  },
  issueCertificate(payload) {
    return api.post('/gamification/certificates/issue', payload);
  },
  myCertificates() {
    return api.get('/gamification/certificates/mine');
  },
  getIssuedCertificate(id) {
    return api.get(`/gamification/certificates/issued/${id}`);
  },
};

export default gamificationService;
