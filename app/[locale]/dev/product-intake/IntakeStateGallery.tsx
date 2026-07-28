"use client";

import ProductIntake from "@/components/products/intake/ProductIntake";
import type { IntakeSession } from "@/lib/products/intake";

/**
 * The client half of the state gallery.
 *
 * Each state is the real component, mounted on a real session value, with
 * resume disabled so one capture cannot overwrite the next one's stored
 * session. `renderBrowse` returns a marker rather than the HS drill-down: the
 * picker has its own evidence, and mounting twenty-five of it would make the
 * gallery about the catalogue instead of about the intake.
 */

export interface GalleryEntry {
  id: string;
  title: string;
  note: string;
  session: IntakeSession;
}

export default function IntakeStateGallery({ states, bare }: { states: GalleryEntry[]; bare: boolean }) {
  return (
    <div>
      {states.map((state) => (
        // `sstep` is the composer's own step container, and the evidence has to
        // be captured in it. The intake lives inside one on the real route, and
        // the first evidence run without it rendered the Bridge into a
        // full-width page it is never given in production. Evidence of a
        // composition the member cannot reach is not evidence.
        <section
          key={state.id}
          className="sstep"
          id={state.id}
          data-state={state.id}
          style={bare ? undefined : { paddingBottom: 64, marginBottom: 64, borderBottom: "1px solid var(--rule)" }}
        >
          {bare ? null : (
            <div className="fphead__eb">
              <span className="fphead__rule" aria-hidden="true" />
              <span className="eyebrow">
                {state.title} / {state.note}
              </span>
            </div>
          )}
          <ProductIntake
            intent={state.session.intent}
            initialSession={state.session}
            disableResume
            renderBrowse={() => (
              <p className="pintake__note">
                The existing HS category drill-down renders here, unchanged. It has its own evidence.
              </p>
            )}
            onResolved={() => {}}
          />
        </section>
      ))}
    </div>
  );
}
