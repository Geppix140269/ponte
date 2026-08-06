"use client";

import { useRef, useState } from "react";
import BridgeShell, { BridgeAction } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
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
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B06` Product description and assets, on the bridge system. Product family
 * only: the path skips this node for a service or a distribution arrangement.
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
 * the moment the member knows what the file is. A screen that lists four files a
 * week later and asks who should see each one is asking them to remember.
 *
 * ## The gate
 *
 * `DECISION-16`. `uploadPermitted` decides, and a signed-out member does not get
 * a file picker. The path sends a signed-out member to `B08` before this, so
 * this is the second line rather than the first.
 *
 * ## What Ponte does not claim
 *
 * `ASSET_PERIMETER` is rendered wherever assets are listed. Ponte does not read
 * a document and does not check what one claims. A member who uploads a
 * certificate and sees no caveat reasonably concludes otherwise, and the buyer
 * is the one who pays for that.
 */

export interface BridgeAssetsProps {
  assets: readonly ListingAsset[];
  onAssets: (assets: readonly ListingAsset[]) => void;
  family: MarketFamily | null;
  signedIn: boolean;
  retention: string;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  onContinue: () => void;
}

export default function BridgeAssets({
  assets,
  onAssets,
  family,
  signedIn,
  retention,
  ledger,
  signals,
  who = null,
  onBack,
  onContinue,
}: BridgeAssetsProps) {
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
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
    onAssets([...assets, asset]);
    setChoosingFor(asset.id);
  }

  function setVisibility(id: string, visibility: Visibility) {
    onAssets(assets.map((asset) => (asset.id === id ? { ...asset, visibility } : asset)));
    setChoosingFor(null);
  }

  return (
    <BridgeShell
      screen="B06"
      phase={assets.length === 0 ? "empty" : "some"}
      node="assets"
      family={family}
      signedIn={signedIn}
      progress={assets.length === 0 ? 0 : 1}
      question="Show buyers what they are looking at."
      accent="looking at."
      eyebrow={summary ?? "Nothing attached"}
      note="A listing with photographs and a specification is read more often than one without. Nothing here is required to publish, and you set who sees each item."
      back={{ label: "The listing so far", onBack }}
      ledger={ledger}
      retention={retention}
      signals={signals}
      who={who}
      actions={
        <BridgeAction
          label={assets.length === 0 ? "Continue without assets" : "Continue"}
          sub={assets.length === 0 ? "You can add them after publishing" : null}
          onClick={onContinue}
        />
      }
    >
      {assets.map((asset) => {
        const level = visibilityLevel(asset.visibility);
        return (
          <button
            key={asset.id}
            className="brg-fact"
            type="button"
            onClick={() => setChoosingFor(asset.id)}
          >
            <span className="brg-fact__k">
              <b>{asset.kind}</b>
              <span>{level.label}</span>
            </span>
            <span className="brg-fact__v">{asset.name}</span>
            <span className="brg-fact__note">
              {level.audience} &middot; {formatBytes(asset.bytes)}
            </span>
          </button>
        );
      })}

      <button
        className="brg-zone"
        data-lead={assets.length === 0 ? "true" : undefined}
        type="button"
        onClick={upload.allowed ? () => picker.current?.click() : undefined}
        aria-disabled={!upload.allowed}
      >
        <span className="brg-zone__index">{String(assets.length + 1).padStart(2, "0")}</span>
        <span className="brg-zone__title">
          {assets.length === 0 ? "Add a photograph or document" : "Add another"}
        </span>
        <span className="brg-zone__detail">
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

      <div className="brg-group">Visibility, per item</div>
      {VISIBILITY_LEVELS.map((level) => (
        <div className="brg-row" key={level.key}>
          <span className="brg-row__label">{level.audience}</span>
          <span className="brg-row__value">{level.label}</span>
        </div>
      ))}

      {assets.length > 0 && <div className="brg-perimeter">{ASSET_PERIMETER}</div>}

      {choosingFor && (
        <>
          <button
            type="button"
            className="brg-scrim"
            aria-label="Close visibility"
            onClick={() => setChoosingFor(null)}
          />
          <div
            className="brg-sheet"
            data-ground="cream"
            role="dialog"
            aria-label="Who can see this item"
          >
            <div className="brg-sheet__inner">
              <div className="brg-sheet__head">
                <b>Who can see this item?</b>
                <button type="button" onClick={() => setChoosingFor(null)}>
                  Done
                </button>
              </div>
              {VISIBILITY_LEVELS.map((level) => {
                const asset = assets.find((a) => a.id === choosingFor);
                const selected = asset?.visibility === level.key;
                return (
                  <button
                    key={level.key}
                    className="brg-item"
                    type="button"
                    aria-pressed={selected}
                    data-chosen={selected ? "true" : undefined}
                    onClick={() => setVisibility(choosingFor, level.key)}
                  >
                    <span className="brg-fact__v" style={{ marginBlockStart: 0 }}>
                      {level.label}
                    </span>
                    <span className="brg-fact__note">{level.audience}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </BridgeShell>
  );
}
