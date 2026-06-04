import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealRoom } from "@/lib/network/deal-data";
import { DealRoom } from "@/components/network/DealRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deal room", robots: { index: false } };

export default async function DealRoomPage({ params }: { params: { id: string } }) {
  const room = await getDealRoom(params.id);
  if (!room) notFound();
  return (
    <section className="container-px py-10 max-w-container mx-auto">
      <DealRoom room={room} />
    </section>
  );
}
