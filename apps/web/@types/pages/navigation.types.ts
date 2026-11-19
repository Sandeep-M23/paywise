export type PageGuide = {
  /** One line under the page title. */
  summary: string;
  /** What you can do here, in the order you would usually do it. */
  steps: { title: string; text: string }[];
  tip?: string;
};
