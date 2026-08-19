import api from "./api";

const analyticsService = {
  admin() {
    return api.get("/analytics/admin");
  },
  teacher() {
    return api.get("/analytics/teacher");
  },
  student() {
    return api.get("/analytics/student");
  },
};

export default analyticsService;
