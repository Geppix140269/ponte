import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { PonteLanding } from "@/components/landing/PonteLanding";

export const metadata: Metadata = {
  title: "Ponte — Verified counterparties. Live trade intelligence.",
  description:
    "The verified network for real buyers and sellers. Verify any principal in seconds against 7B+ shipment records and global sanctions lists. No mandates, no daisy chains.",
};

// The landing is for visitors. Signed-in users skip it and go straight to the app.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/network/listings");
  return <PonteLanding />;
}
