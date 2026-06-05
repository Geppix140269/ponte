import type { Metadata } from "next";
import { NetworkLanding } from "@/components/network/NetworkLanding";

export const metadata: Metadata = {
  title: "ponte.trade — Build Trust. Trade Smarter.",
  description: "The verified network for real buyers, sellers, and trading houses. Trade directly with verified principals, powered by ADAMftd grounded trade intelligence.",
};

export default function NetworkHomePage() {
  return <NetworkLanding />;
}
