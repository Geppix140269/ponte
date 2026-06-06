import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealRoom } from "@/lib/network/deal-data";
import { getDealSettlement } from "@/lib/network/settlement-actions";
import { DealRoom } from "@/components/network/DealRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deal room", robots: { index: false } };

export default async function DealRoomPage({ params }: { params: { id: string } }) {
  const room = await getDealRoom(params.id);
  const settlement = room ? await getDealSettlement(params.id) : null;
  if (!room) notFound();
  return (
    <section className="container-px py-10 max-w-container mx-auto">
      <DealRoom room={room} settlement={settlement} />
    </section>
  );
}
