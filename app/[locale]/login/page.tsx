import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import DeskLoginForm from "@/components/desk/DeskLoginForm";
import { safeInternalDestination } from "@/lib/auth/next-destination";
import "@/components/desk/desk.css";

/**
 * The sign-in door, in the Desk. A generic visit receives the member home as
 * its explicit destination; a valid journey-specific `next` is preserved.
 */

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function LoginPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { next?: string | string[]; error?: string | string[] };
}) {
  setRequestLocale(params.locale);

  const rawNext = first(searchParams?.next);
  const next = safeInternalDestination(rawNext);
  if (rawNext !== next) {
    const query = new URLSearchParams({ next });
    if (first(searchParams?.error) === "auth") query.set("error", "auth");
    redirect(`/login?${query.toString()}`);
  }

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null}>
        <DeskLoginForm />
      </DeskShell>
    </div>
  );
}
