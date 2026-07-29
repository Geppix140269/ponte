import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Band, Empty, RoomHeader } from "@/components/deal-room/primitives";
import { listActivity, loadRoom } from "@/lib/deal-room/queries";
import { ACTIVITY_EVENT_LABEL } from "@/lib/deal-room/activity";

export const dynamic = "force-dynamic";

/**
 * DR-18: the attributable history.
 *
 * Every row here came through the activity SELECT policy, which filters by
 * sub-room. A participant reading this feed cannot see an event from a
 * workspace they are not in, so the history can never leak the existence of one
 * - which is the way acceptance criterion 13 is most easily broken by accident.
 *
 * The feed carries material events only. Page views and minor edits produce no
 * event, so a quiet week reads as a quiet week rather than as noise.
 *
 * Nothing on this page can be edited or deleted. The table refuses UPDATE and
 * DELETE at the database, including to its owner.
 */
export default async function ActivityPage({
  params,
}: {
  params: { locale: string; roomId: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const events = await listActivity(params.roomId, 200);

  return (
    <>
      <RoomHeader
        reference={`${access.room.ref} · History`}
        title="What has happened in this room"
        dealLine="Material events only, each attributed to the person who caused it. This record is append-only: nothing here can be edited or removed, including by Ponte."
      />

      <Band title={events.length === 1 ? "1 event" : `${events.length} events`}>
        {events.length === 0 ? (
          <Empty>
            Nothing material has happened yet. Admission, procedure approval, evidence, clarifications, blockers and
            closure all appear here as they occur.
          </Empty>
        ) : (
          <ol className="dr__list">
            {events.map((event) => (
              <li className="dr__item" key={event.id}>
                <div>
                  <p className="dr__item-title">{ACTIVITY_EVENT_LABEL[event.eventType] ?? event.eventType}</p>
                  <p className="dr__item-meta">{event.summary}</p>
                  <p className="dr__item-limit">
                    {event.actorLabel}
                    {event.actorOrganisationLabel ? `, ${event.actorOrganisationLabel}` : ""}
                  </p>
                </div>
                <time className="dr__weight" dateTime={event.createdAt}>
                  {new Date(event.createdAt).toISOString().replace("T", " ").slice(0, 16)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </Band>
    </>
  );
}
