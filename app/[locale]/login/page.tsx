import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import DeskLoginForm from "@/components/desk/DeskLoginForm";
import "@/components/desk/desk.css";

/**
 * The sign-in door, in the Desk.
 *
 * It used to render inside the legacy obsidian application: black and lime, the
 * old lockup, and a Marketplace / Fees navigation the Desk does not have. That
 * page was reachable in one click from the Desk header's own Sign in control,
 * so a member left the new product at the exact moment they were being asked to
 * commit to it. Of all the pages to leave the system on, the authentication
 * door is the worst one.
 *
 * The authentication itself is untouched. `DeskLoginForm` is the previous page
 * component moved intact: the same `useOtp` flow, the same Google identity
 * path, the same `?next=` handling, the same error copy. What changed is the
 * shell it renders in and the values its class hooks resolve to.
 *
 * There is no journey rail. Signing in is not a station on R-FIND or R-SUBMIT;
 * it is a boundary a member crosses while standing somewhere else, and the
 * `?next=` they arrived with is what takes them back to it.
 */

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null}>
        <DeskLoginForm />
      </DeskShell>
    </div>
  );
}
