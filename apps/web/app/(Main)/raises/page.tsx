import type { Metadata } from "next";
import { RaisePlanner } from "@/components/Block/Raises/RaisePlanner";

export const metadata: Metadata = { title: "Raise planner" };

export default function RaisesPage() {
  return <RaisePlanner />;
}
