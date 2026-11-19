import type { Metadata } from "next";
import { ImportWizard } from "@/components/Block/Import/ImportWizard";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return <ImportWizard />;
}
