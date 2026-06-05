import type { Metadata } from "next";
import { PonteLanding } from "@/components/landing/PonteLanding";

export const metadata: Metadata = {
  title: "Ponte — Verified counterparties. Live trade intelligence.",
  description:
    "The verified network for real buyers and sellers. Verify any principal in seconds against 7B+ shipment records and global sanctions lists. No mandates, no daisy chains.",
};

export default function HomePage() {
  return <PonteLanding />;
}
