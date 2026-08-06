"use client";

import { useRef, useState, useTransition } from "react";
import Frame, { Action, Retention } from "./Frame";
import {
  VISIBILITY_LEVELS,
  visibilityLevel,
  uploadPermitted,
  formatBytes,
  assetSummary,
  ASSET_PERIMETER,
  type ListingAsset,
  type Visibility,
} from "@/lib/publish/assets";

/**
 * `B06` Product description and assets. Product family only.
 *
 * ## Why visibility is set per item and at the point of adding it
 *
 * A specification sheet and a phytosanitary certificate belong to the same
 * listing and should not have the same audience. One sells the goods; the other
 * is evidence a member hands over once a counterparty is real. A single
 * listing-wide switch forces a choice between publishing the certificate and
 * hiding the specification, and almost everyone hides everything.
 *
 * Asked at the point of adding, not on a later settings screen, because that is
 * the moment the member knows what the file is. A screen that lists four files
 * a week later and asks who should see each one is asking them to remember.
 *
 * ## The gate
 *
 * `DECISION-16`. `uploadPermitted` decides, and a signed-out member does not
 * get a file picker. The path skips this node entirely for a signed-out member
 * (they meet `B08` first), so this is the second line rather than the first.
 *
 * ## What Ponte does not claim
 *
 * `ASSET_PERIMETER` is rendered wherever assets are listed. Ponte does not read
 * a document and does not check what one claims. A member who uploads a
 * certificate and sees no caveat reasonably concludes otherwise, and the buyer
 * is the one who pays for that.
 */

export interface DescribeAndAssetsProps {
  assets: readonly ListingAsset[];
  onAssets: (assets: readonly ListingAsset[]) => void;
  signedIn: boolean;
  retention: string;
  onBack: () => void;
  onContinue: () => void;
}

export default function DescribeAndAssets({
  assets,
  onAssets,
  signedIn,
  retention,
  onBack,
  onContinue,
}: DescribeAndAssetsProps) {
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement | null>(null);
  const upload = uploadPermitted(signedIn);
  const summary = assetSummary(assets);

  function add(file: File) {
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()!.toUpperCase().slice(0, 4)
      : "FILE";
    const asset: ListingAsset = {
      id: `${file.name}-${file.size}`,
      kind: extension,
      name: file.name,
      bytes: file.size,
      // Private until the member says otherwise. The safe default is the one
      // that cannot expose something they had not decided to expose.
      visibility: "private",
    };
    startTransition(() => {
      onAssets([...assets, asset]);
      setChoosingFor(asset.id);
    });
  }

  function setVisibility(id: string, visibility: Visibility) {
    onAssets(assets.map((asset) => (asset.id === id ? { ...asset, visibility } : asset)));
    setChoosingFor(null);
  }

  return (
    <Frame
      screen="B06"
      stage={3}
      back="The listing so far"
      onBack={onBack}
      pending={pending}
      phase={assets.length === 0 ? "empty" : "some"}
      footer={
        <>
          <Action
            label={assets.length === 0 ? "Continue without assets" : "Continue"}
            sub={assets.length === 0 ? "You can add them after publishing" : null}
            onClick={onContinue}
          />
          <Retention sentence={retention} />
        </>
      }
    >
      <div className="pb__pad" style={{ paddingBottom: 10 }}>
        {summary && <span className="lab">{summary}</span>}
        <h1 className="stmt stmt--2" style={summary ? { marginTop: 12 } : undefined}>
          Show buyers what they are looking at.
        </h1>
      </div>

      {assets.length === 0 && (
        <div className="pb__pad" style={{ padding: "0 20px 6px" }}>
          <p className="prose">
            A listing with photographs and a specification is read more often than one without.
            Nothing here is required to publish, and you set who sees each item.
          </p>
        </div>
      )}

      {assets.length > 0 && (
        <div className="ast">
          {assets.map((asset) => {
            const level = visibilityLevel(asset.visibility);
            return (
              <button
                key={asset.id}
                className="ast__i"
                type="button"
                onClick={() => setChoosingFor(asset.id)}
              >
                <span className="ast__t">{asset.kind}</span>
                <span>
                  <b>{asset.name}</b>
                  <small>
                    <span className={`mk mk--${markFor(asset.visibility)}`} />
                    {level.label} · {formatBytes(asset.bytes)}
                  </small>
                </span>
                <span className="go">›</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        className="ast__add"
        type="button"
        onClick={upload.allowed ? () => picker.current?.click() : undefined}
        aria-disabled={!upload.allowed}
      >
        <b>{assets.length === 0 ? "Add a photograph or document" : "Add another"}</b>
        <span>
          {upload.allowed
            ? "Photograph the goods, or attach a specification, certificate or price list. You are signed in, so files are held against your account."
            : upload.reason}
        </span>
      </button>

      <input
        ref={picker}
        type="file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) add(file);
          event.target.value = "";
        }}
      />

      <div className="pb__pad" style={{ padding: "20px 20px 8px" }}>
        <span className="lab">Visibility, per item</span>
      </div>
      <div className="lay__l">
        {VISIBILITY_LEVELS.map((level) => (
          <div key={level.key}>
            <span>
              <span className="k">{level.label}</span>
              <span className="v">{level.audience}</span>
            </span>
            <span className="fx">
              <span className={`mk mk--${markFor(level.key)}`} />
            </span>
          </div>
        ))}
      </div>

      {assets.length > 0 && (
        <div className="pb__pad" style={{ padding: "18px 20px 4px" }}>
          <p className="note">{ASSET_PERIMETER}</p>
        </div>
      )}

      {choosingFor && (
        <>
          <button
            type="button"
            className="pick__scrim"
            aria-label="Close visibility"
            onClick={() => setChoosingFor(null)}
          />
          <div className="pick" role="dialog" aria-label="Who can see this item">
            <div className="pick__h">
              <b>Who can see this item?</b>
              <button type="button" onClick={() => setChoosingFor(null)}>
                Done
              </button>
            </div>
            <div className="pick__b">
              <div className="rows">
                {VISIBILITY_LEVELS.map((level) => {
                  const asset = assets.find((a) => a.id === choosingFor);
                  const selected = asset?.visibility === level.key;
                  return (
                    <button
                      key={level.key}
                      className="row"
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setVisibility(choosingFor, level.key)}
                    >
                      <span className={`mk mk--${selected ? "done" : markFor(level.key)}`} />
                      <span>
                        <b>{level.label}</b>
                        <small>{level.audience}</small>
                      </span>
                      <span className="go">{selected ? "" : "›"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </Frame>
  );
}

/** The mark class for a visibility. Shape carries the degree, not colour. */
function markFor(visibility: Visibility): string {
  if (visibility === "public") return "pub";
  if (visibility === "on_accepted_interest") return "acc";
  return "priv";
}
