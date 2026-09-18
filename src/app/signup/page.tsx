"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { FullPageLoading } from "@/components/Loading";

export default function SignUpPage() {
  return (
    <Suspense fallback={<FullPageLoading label="Loading…" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
