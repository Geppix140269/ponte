import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { dealRoomGate, listRooms } from "@/lib/deal-room/queries";
import { ROOM_STAGE_LABEL } from "@/lib/deal-room/states";
import { Band, Empty, RoomHeader } from "@/components/deal-room/primitives";

export const dynamic = "force-dynamic";

/**
 * The member's rooms.
 *
 * `notFound()` when the flag is off or the member is not allowlisted, rather
 * than a "coming soon" page. An unreleased slice should be indistinguishable
 * from a route that does not exist, and turning the flag off must leave nothing
 * behind that hints at it.
 */
export default async function DealRoomsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const gate = await dealRoomGate();
  if (!gate) notFound();

  const rooms = await listRooms();

  return (
    <>
      <RoomHeader
        reference="Deal Rooms"
        title="Take a Deal forward"
        dealLine="A Deal Room is where a credible transaction is progressed through a procedure both sides agreed, with evidence, decisions and blockers on the record."
      />

      <Band title={rooms.length === 1 ? "1 room" : `${rooms.length} rooms`}>
        {rooms.length === 0 ? (
          <Empty>
            You are not in a Deal Room yet. A room begins from a published Deal once a counterparty has expressed
            credible commercial interest, and it opens only after both principals complete admission.
          </Empty>
        ) : (
          <ul className="dr__list">
            {rooms.map((room) => (
              <li className="dr__item" key={room.id}>
                <div>
                  <p className="dr__item-title">
                    <a className="dr__link" href={`/${params.locale}/deal-rooms/${room.id}`}>
                      {room.title}
                    </a>
                  </p>
                  <p className="dr__item-meta">{ROOM_STAGE_LABEL[room.state]}</p>
                </div>
                <span className="dr__weight">{room.ref}</span>
              </li>
            ))}
          </ul>
        )}
      </Band>
    </>
  );
}
