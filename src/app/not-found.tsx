import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="content" className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-4 py-12">
      <p className="font-display text-sm font-semibold tracking-[0.2em] text-gold uppercase">404</p>
      <h1 className="mt-3 text-3xl text-white">We could not find that page</h1>
      <p className="mt-3 text-silver">
        The link may be out of date. Everything else is still where you left it.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/learn">Go to Learn</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
