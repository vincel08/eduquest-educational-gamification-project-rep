import api from "./api";

const schoolYearService = {
  getCurrent() {
    return api.get("/school-year");
  },
  update(schoolYear) {
    return api.put("/school-year", { schoolYear });
  },
  listYears() {
    return api.get("/school-year/years");
  },
  addYear(schoolYear) {
    return api.post("/school-year/years", { schoolYear });
  },
  removeYear(startYear) {
    return api.delete(`/school-year/years/${startYear}`);
  },
};

export default schoolYearService;
