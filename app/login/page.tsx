import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-12 text-ink">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-black">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-ink text-white">V</span>
          VShare
        </Link>
        <Suspense fallback={<div className="rounded-[2rem] bg-white p-6 shadow-soft">Loading sign in...</div>}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
