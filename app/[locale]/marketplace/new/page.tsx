import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import ListingForm from "@/components/ListingForm";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "marketplace",
  });

  return {
    title: t("new.meta.title"),
    description: t("new.meta.description"),
    alternates: alternatesFor("/marketplace/new", params.locale),
  };
}

export default async function NewListingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { type?: string; restore?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketplace");

  const typeParam = searchParams.type;
  const initialType =
    typeParam === "requirement" || typeParam === "service" ? typeParam : "offer";
  if (!isSupabaseConfigured()) redirect("/marketplace");
  // No sign-in required to build and preview. The account comes at publish.
  const user = await getUser();

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20">
        <span className="pill">{t("new.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.02, letterSpacing: "-0.015em" }}
        >
          {t("new.heading")}
        </h1>
        <p className="text-[16px] text-gray-2 leading-relaxed max-w-2xl">
          {t("new.intro")}
        </p>
      </header>

      <section className="container-px pb-24">
        <div className="max-w-2xl">
          <ListingForm
            initialType={initialType}
            isAuthed={Boolean(user)}
            restoreDraft={searchParams.restore === "1"}
          />
        </div>
      </section>
    </>
  );
}
