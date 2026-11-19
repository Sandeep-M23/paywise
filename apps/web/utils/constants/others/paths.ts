export const PATH = {
  LOGIN: "/login",
  OVERVIEW: "/",
  EMPLOYEES: "/employees",
  INSIGHTS: "/insights",
  FAIRNESS: "/fairness",
  RAISES: "/raises",
  IMPORT: "/import",
};

/** Pages a signed-out visitor may open; everything else redirects to sign in. */
export const OPEN_PATHS = [PATH.LOGIN];
