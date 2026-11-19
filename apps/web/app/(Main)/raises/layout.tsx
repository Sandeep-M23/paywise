import { HEADER_TITLE } from "@/utils/constants/others/header";
import type { ReactNode } from "react";

export const metadata = {
  title: HEADER_TITLE.RAISES,
};

export default function layout({ children }: { children: ReactNode }) {
  return children;
}
