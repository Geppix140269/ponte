import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { legacyNewListingTarget } from "@/lib/marketplace/legacy-redirect";

// The retired listing composer.
//
// This route once rendered the legacy obsidian `ListingForm` and read
// `searchParams.edit`. A live transactional email ("Complete your listing")
// pointed here with `id=`, so the page opened a blank form instead of the saved
// listing named in the mail, routing a member into a deprecated application
// (LB-009). It renders nothing now. Every request is forwarded to the current
// constitutional Structure composer; `legacyNewListingTarget` is the whole
// contract and is unit-tested in isolation.
//
// The redirect is temporary (Next's default, 307): the destination is derived
// from the query and the mapping may evolve, so it must not be cached by a
// browser or proxy the way a 308 permanent redirect would be. It also carries
// no message body and no metadata, because a page that only redirects should
// not be indexable or previewable as content.

export const dynamic = "force-dynamic";

export default async function RetiredNewListingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { id?: string | string[]; edit?: string | string[] };
}) {
  setRequestLocale(params.locale);
  redirect(legacyNewListingTarget({ id: searchParams?.id, edit: searchParams?.edit }));
}
