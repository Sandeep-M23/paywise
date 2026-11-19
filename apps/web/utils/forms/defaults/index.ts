import type { EmployeeFormValues } from "@/utils/forms/schemas";

export const EMPLOYEE_FORM_DEFAULTS: EmployeeFormValues = {
  employeeCode: "",
  fullName: "",
  email: "",
  jobTitle: "",
  department: "",
  countryCode: "IN",
  salary: "",
  gender: "undisclosed",
  employmentType: "full_time",
  hireDate: "",
};
