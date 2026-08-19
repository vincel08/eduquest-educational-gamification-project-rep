import api from "./api";

const classSectionService = {
  list(params) {
    return api.get("/class-sections", { params });
  },
  options(params) {
    return api.get("/class-sections/options", { params });
  },
  create(payload) {
    return api.post("/class-sections", payload);
  },
  update(id, payload) {
    return api.put(`/class-sections/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/class-sections/${id}`);
  },
};

export default classSectionService;
