import type { Metadata } from "next";
import { OverviewView } from "@/components/Block/Overview/OverviewView";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return <OverviewView />;
}
