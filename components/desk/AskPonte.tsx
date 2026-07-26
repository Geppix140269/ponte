"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * The objective console on the landing.
 *
 * It does one thing: it carries what the member says they are trying to do into
 * R-FIND, where it becomes the stated objective on the command bar and marks
 * the Objective station taken. Nothing is interpreted here, nothing is
 * classified, and no product, quantity or market is inferred from the text. It
 * is the member's own sentence, carried forward verbatim.
 *
 * That restraint is the point. A console that silently turned "I mill refined
 * sugar in Santos" into a product filter would be Ponte inventing a search the
 * member never asked for, and the first thing they would see is a result set
 * they cannot explain. Interpretation is real work with its own journey; it is
 * not something to fake in a text box on the entrance.
 *
 * The objective is optional. A member who already knows they want to read
 * signals can just go and read them, and the Objective station then correctly
 * reports that they stated none.
 */
export default function AskPonte({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const [objective, setObjective] = useState("");

  function go() {
    const stated = objective.trim();
    router.push(
      stated ? `/market-signals?objective=${encodeURIComponent(stated)}` : "/market-signals",
    );
  }

  return (
    <form
      className="ask"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <div className="ask__h">
        <span>Ask Ponte</span>
        <span>In your own words</span>
      </div>

      <div className="ask__b">
        <label className="sr-only" htmlFor="dk-objective">
          State your objective
        </label>
        <textarea
          id="dk-objective"
          className="ask__in"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder={placeholder}
          rows={3}
          onKeyDown={(e) => {
            // Enter states the objective. Shift and enter is a new line,
            // because a member describing a corridor sometimes needs two.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              go();
            }
          }}
        />
      </div>

      <div className="ask__r">
        <button className="b b--block" type="submit">
          Read the market against this
        </button>
        <p className="ask__note">
          Your words are carried as stated. Ponte does not read a product, a quantity or a market
          into them.
        </p>
      </div>

      <div className="ask__f">
        <span>No account needed to look</span>
        <span>Ponte will not invent a product</span>
      </div>
    </form>
  );
}
