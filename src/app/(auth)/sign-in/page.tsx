import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/shell/brand";
import { SignInForm } from "@/components/auth/sign-in-form";
import { ErrorState } from "@/components/ui/states";
import { isDatabaseConfigured } from "@/platform/env";
import { safeNextPath } from "@/platform/auth/redirect";
import { readViewer } from "@/modules/profiles";

export const metadata = { title: "Sign in" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (!isDatabaseConfigured()) {
    return (
      <main id="content" className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
        <h1 className="mb-4 text-3xl text-white">Sign-in is unavailable</h1>
        <ErrorState
          title="No account service is configured"
          body="This instance has no account service configured, so nobody can sign in here."
        />
      </main>
    );
  }

  const viewer = await readViewer();

  // Someone already signed in has nothing to do here.
  if (viewer && !viewer.isGuest) {
    redirect(next);
  }

  return (
    <main id="content" className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-start">
        <BrandLockup instanceId="auth" />
      </Link>

      <h1 className="text-3xl text-white">
        {viewer?.isGuest ? "Keep your progress" : "Sign in"}
      </h1>
      <p className="mt-3 text-silver">
        {viewer?.isGuest
          ? "Add your email address and everything you have done so far stays with you."
          : "We send a link to your email address. There is no password to remember."}
      </p>

      <SignInForm next={next} isGuest={viewer?.isGuest === true} initialError={params.error} />

      <p className="mt-8 text-sm text-silver-dim">
        By continuing you agree to how we handle your data. You can export or delete everything at
        any time from the You tab.
      </p>
    </main>
  );
}
