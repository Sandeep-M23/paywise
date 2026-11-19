const generateHeaderTitle = (title: string): string => `Paywise - ${title}`;

interface HeaderTitle {
  LOGIN: string;
}

export const HEADER_TITLE: HeaderTitle = {
  LOGIN: generateHeaderTitle("Login"),
};
