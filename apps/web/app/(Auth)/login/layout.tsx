import { HEADER_TITLE } from "@/utils/others/header";
import type { ReactNode } from "react";

export const metadata = {
  title: HEADER_TITLE.LOGIN,
};

export default function layout({ children }: { children: ReactNode }) {
  return children;
}
