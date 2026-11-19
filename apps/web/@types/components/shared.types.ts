import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";

export type AppIcon = ComponentType<IconProps>;

export type FacetOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Shown on the right, e.g. how many people have this value. */
  count?: number;
};

export type Facet = {
  key: string;
  label: string;
  icon: AppIcon;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Single choice (e.g. status) instead of any number of values. */
  single?: boolean;
  /** The selection that means "not filtered" (status: Active). Defaults to none. */
  defaultValue?: string[];
  searchable?: boolean;
};

export type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};
