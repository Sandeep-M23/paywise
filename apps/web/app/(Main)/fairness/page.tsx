import type { Metadata } from "next";
import { FairnessView } from "@/components/Block/Fairness/FairnessView";

export const metadata: Metadata = { title: "Pay fairness" };

export default function FairnessPage() {
  return <FairnessView />;
}
