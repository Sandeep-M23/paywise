import type { Metadata } from "next";
import { RaisePlanner } from "@/components/raises/raise-planner";

export const metadata: Metadata = { title: "Raise planner" };

export default function RaisesPage() {
  return <RaisePlanner />;
}
