import api from "./api";

const schoolYearService = {
  getCurrent() {
    return api.get("/school-year");
  },
  update(schoolYear) {
    return api.put("/school-year", { schoolYear });
  },
};

export default schoolYearService;
