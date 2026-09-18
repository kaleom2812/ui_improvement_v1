"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { FullPageLoading } from "@/components/Loading";

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageLoading label="Loading…" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
