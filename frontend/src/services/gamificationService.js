import api from "./api";

const gamificationService = {
  me() {
    return api.get("/gamification/me");
  },
  leaderboard(params) {
    return api.get("/gamification/leaderboard", { params });
  },
  badges() {
    return api.get("/gamification/badges");
  },
  createBadge(payload) {
    return api.post("/gamification/badges", payload);
  },
  updateBadge(id, payload) {
    return api.put(`/gamification/badges/${id}`, payload);
  },
  deleteBadge(id) {
    return api.delete(`/gamification/badges/${id}`);
  },
  awardBadge(payload) {
    return api.post("/gamification/badges/award", payload);
  },
  medals() {
    return api.get("/gamification/medals");
  },
  createMedal(payload) {
    return api.post("/gamification/medals", payload);
  },
  updateMedal(id, payload) {
    return api.put(`/gamification/medals/${id}`, payload);
  },
  deleteMedal(id) {
    return api.delete(`/gamification/medals/${id}`);
  },
  awardMedal(payload) {
    return api.post("/gamification/medals/award", payload);
  },
};

export default gamificationService;
