import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getUser } from "@/lib/auth";
import { dealRoomGate, listRooms } from "@/lib/deal-room/queries";
import { ROOM_STAGE_LABEL } from "@/lib/deal-room/states";
import { Band, Empty, RoomHeader } from "@/components/deal-room/primitives";
import NotOpenYet from "@/components/deal-room/NotOpenYet";

export const dynamic = "force-dynamic";

/**
 * The member's rooms.
 *
 * `dealRoomGate()` returns null for three different reasons and this page used
 * to answer all three with `notFound()`:
 *
 *   1. nobody is signed in;
 *   2. the route flag `NEXT_PUBLIC_DEAL_ROOM` is not `on`;
 *   3. the member is not in `DEAL_ROOM_ALLOWLIST`.
 *
 * None of the three means "this page does not exist", and each has a different
 * correct answer. See `NotOpenYet` for why concealment stopped being the right
 * behaviour the moment the entrance made "Open a Deal Room" its primary action.
 */
export default async function DealRoomsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  /*
   * No login wall here either. See the note in `propose/page.tsx`: the account
   * gate fires at the moment of irreversible action, not at the door.
   *
   * A visitor with no session has no rooms, which is the empty state below and
   * an honest one. `NotOpenYet` is kept for the case it was written for: a
   * deployment that has explicitly closed the Deal Room with
   * NEXT_PUBLIC_DEAL_ROOM=off.
   */
  const signedIn = await getUser();
  const gate = await dealRoomGate();
  if (signedIn && !gate) return <NotOpenYet locale={params.locale} />;

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
