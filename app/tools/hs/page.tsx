import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import HSCodeSearch from "@/components/hs/HSCodeSearch";

export const metadata = {
  title: "HS Code Finder — Ponte",
  description:
    "Find the correct Harmonized System code for any product across US HTS, EU TARIC, UK GTT, and the WCO standard.",
};

export default async function HSToolPage() {
  const user = await getUser();
  if (!user) redirect("/login?returnTo=/tools/hs");

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">HS Code Finder</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Describe your product in plain language and get the correct Harmonized
            System code for US, EU, UK, or the generic WCO standard.
          </p>
        </div>
        <HSCodeSearch />
      </div>
    </main>
  );
}
