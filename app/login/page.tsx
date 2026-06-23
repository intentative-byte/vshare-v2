import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_center,rgba(245,196,81,0.18),transparent_30rem)]" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
