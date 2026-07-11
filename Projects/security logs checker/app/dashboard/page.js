"use client";
import { Suspense } from "react";
import SocApp from "@/components/SocApp";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <SocApp />
    </Suspense>
  );
}
