import api from "./api";

const analyticsService = {
  admin(params) {
    return api.get("/analytics/admin", { params });
  },
  teacher(params) {
    return api.get("/analytics/teacher", { params });
  },
  student() {
    return api.get("/analytics/student");
  },
};

export default analyticsService;
