import {
  BarChart3,
  Calculator,
  FileUp,
  LayoutDashboard,
  Scale,
  Users,
  type AppIcon,
} from "@/components/Icons";

export type PageGuide = {
  /** One line under the page title. */
  summary: string;
  /** What you can do here, in the order you would usually do it. */
  steps: { title: string; text: string }[];
  tip?: string;
};

export const LINKS: {
  href: string;
  label: string;
  icon: AppIcon;
  exact?: boolean;
  guide: PageGuide;
}[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    guide: {
      summary: "Where pay stands today, and what needs a look.",
      steps: [
        {
          title: "Check the numbers",
          text: "Headcount, pay gaps to review, outliers and the last import, at a glance.",
        },
        {
          title: "Spot what needs attention",
          text: "Gender gaps of 5% or more and the people paid furthest from their peers.",
        },
        {
          title: "Dig in",
          text: "Click a tile, a country or a person to open the detail behind it.",
        },
      ],
      tip: "Every tile is a link to the page that explains it.",
    },
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
    guide: {
      summary: "Every employee record: find people, change salaries, export.",
      steps: [
        {
          title: "Find people",
          text: "Search by name, email or code, then narrow by country, department, job title or status.",
        },
        {
          title: "Open a record",
          text: "Click a row to see salary history, change a salary, edit details or deactivate.",
        },
        {
          title: "Take it to Excel",
          text: "Export CSV downloads exactly the rows your filters show.",
        },
      ],
      tip: "Press / to jump to search. Click a column header to sort.",
    },
  },
  {
    href: "/insights",
    label: "Pay insights",
    icon: BarChart3,
    guide: {
      summary: "How we pay people in one country, in its own currency.",
      steps: [
        {
          title: "Pick a country",
          text: "Every figure on the page is for that country only, in its currency.",
        },
        {
          title: "Read typical pay",
          text: "Median, average and payroll, then pay bands per job title: lowest to highest, with the median marked.",
        },
        {
          title: "Compare",
          text: "The breakdown tables split pay by job title, department and country.",
        },
      ],
      tip: "Active employees only. Medians match Excel's PERCENTILE.INC.",
    },
  },
  {
    href: "/fairness",
    label: "Pay fairness",
    icon: Scale,
    guide: {
      summary: "Gender pay gaps and people paid far from their peers.",
      steps: [
        {
          title: "Check gender gaps",
          text: "Women and men in the same job and country are compared; gaps of 5% or more are flagged.",
        },
        {
          title: "Focus",
          text: "Filter by country, job title or status to see only what needs review.",
        },
        {
          title: "Review outliers",
          text: "People paid unusually far from peers. Open a row to check the record.",
        },
      ],
      tip: "Full-time employees only; groups with fewer than 5 women or men are hidden for privacy.",
    },
  },
  {
    href: "/raises",
    label: "Raise planner",
    icon: Calculator,
    guide: {
      summary: "Plan raises, see what they cost, then apply them in one go.",
      steps: [
        {
          title: "Set a group raise",
          text: "A % for everyone active who matches a country, department and job title. Use 0% to skip.",
        },
        {
          title: "Add individual raises",
          text: "Find a person and give a custom % or a new salary; it replaces the group raise for them.",
        },
        {
          title: "Apply",
          text: "Check the cost per currency, pick the date and reason, and apply. All or nothing.",
        },
      ],
      tip: "Nothing changes until you confirm. Mistakes are fixed later with a correction.",
    },
  },
  {
    href: "/import",
    label: "Import",
    icon: FileUp,
    guide: {
      summary: "Bring employees in from a CSV, checked before anything is saved.",
      steps: [
        {
          title: "Upload",
          text: "Drop a CSV (e.g. saved from Excel). Download the sample to see the columns.",
        },
        {
          title: "Review",
          text: "Every row is checked: see what will be created, updated or has errors, and fix errors in place.",
        },
        {
          title: "Import",
          text: "Valid rows are saved together. Past imports are listed with what each changed.",
        },
      ],
      tip: "Rows with errors are skipped, never half-saved.",
    },
  },
];

export function isActive(pathname: string, { href, exact }: { href: string; exact?: boolean }) {
  return exact ? pathname === href : pathname.startsWith(href);
}
