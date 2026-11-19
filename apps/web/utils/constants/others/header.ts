const generateHeaderTitle = (title: string): string => `Paywise - ${title}`;

interface HeaderTitle {
  LOGIN: string;
  OVERVIEW: string;
  EMPLOYEES: string;
  INSIGHTS: string;
  FAIRNESS: string;
  RAISES: string;
  IMPORT: string;
}

export const HEADER_TITLE: HeaderTitle = {
  LOGIN: generateHeaderTitle("Login"),
  OVERVIEW: generateHeaderTitle("Overview"),
  EMPLOYEES: generateHeaderTitle("Employees"),
  INSIGHTS: generateHeaderTitle("Pay insights"),
  FAIRNESS: generateHeaderTitle("Pay fairness"),
  RAISES: generateHeaderTitle("Raise planner"),
  IMPORT: generateHeaderTitle("Import"),
};
