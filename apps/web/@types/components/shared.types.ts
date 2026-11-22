import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";

export type AppIcon = ComponentType<IconProps>;

export type FacetOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
};

export type Facet = {
  key: string;
  label: string;
  icon: AppIcon;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  single?: boolean;
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
