import type { Metadata } from "next";
import { NetworkLanding } from "@/components/network/NetworkLanding";

export const metadata: Metadata = {
  title: "ponte.trade — Build Trust. Trade Smarter.",
  description: "The verified professional network for commodity brokers, traders, and counterparties. Powered by ADAMftd grounded trade intelligence.",
};

export default function NetworkHomePage() {
  return <NetworkLanding />;
}
