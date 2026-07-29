# Ponte Bridge System v1 — approved source manifest

This manifest records the exact owner-approved delivery reviewed on 27 July 2026.

Every row is verified against a file **inside this package**, under
`source/`, `implementation/` or `reference/`. Nothing here checksums a file that
lives outside the approved delivery.

That was not always true. `ponte-flow/tokens/ponte-flow-tokens.css` previously
resolved to the live `design-system/ponte-flow/tokens/ponte-flow-tokens.css`, so
this manifest pinned a shared token file the Bridge package does not own. Any
authorised palette change would then have had to edit this record, and the only way
to keep the check green would have been to re-hash the live file after each change,
which is a manifest that moves with the thing it is supposed to pin.

ADR-0015 section S-1 decoupled them. The row is unchanged and its hash is unchanged,
because the package now carries its own **byte-identical snapshot** of the token
file exactly as delivered on 27 July 2026, at
`source/ponte-flow/tokens/ponte-flow-tokens.css`. The live token set is governed
separately, by the Ponte Design Constitution and ADR-0015, and its values move as
approved decisions require without touching this record.

## SHA-256

| File | SHA-256 |
|---|---|
| `00_README.md` | `35d1a54d7b64f9e0c7b175c32e9795ed126a4993d7e89e25983b4ad34a26de41` |
| `01_IMPLEMENTATION_NOTES.md` | `fda3acb8893c0a088dd2f9b49f18e54c6dbb10bb4351517f6fc9f9e72979688b` |
| `Ponte Bridge System.html` | `135027122074eed230bcce38ecca2dc7a679e26f424672c26328b9866b2d9b14` |
| `Ponte Landing - Bridge.html` | `ffe2a287a2604409ff56798b2b276d31a680c67278577df4847a077f95f82d36` |
| `ponte-bridge.css` | `90e20b416aeda96f6bdb87a6a80191038bae114fa554441c29329e0159296afa` |
| `ponte-bridge.js` | `3ff3210464d3208c058bcd9b7feb80801c77dc23db28927c8997df8aa62b5f4f` |
| `ponte-bridge-demos.js` | `f909d08714825515e9297f603493016c4eae060e1f73355d8fbf4c580c558093` |
| `ponte-flow/tokens/ponte-flow-tokens.css` | `dabc089f0b9822242cc0a3d8783c2b19ab0021ce98c82d9cfd8f6d1648483d5f` |
| `reference/desktop-0-full-composition.png` | `7f494161afbda82b91c5ab9290bf62fd8c54fbf4800a5a310464641519e567c2` |
| `reference/desktop-1-family-neutral.png` | `343a2ef342d042abdda78d34a0a1d0a0da37493db095aa69bd1a562278ac132c` |
| `reference/desktop-2-products-selected.png` | `2481171d0c77bf2046352ad4794bb5fdae2ab39074bf979cbb7adee6adbffd8c` |
| `reference/desktop-3-trade-services-selected.png` | `2919559e237ff1095ee34237d936bb4edbcf670e3dd325d3d6eecfe9c7baca87` |
| `reference/desktop-4-distribution-selected.png` | `a21cbe33a8f538c0d301cb05560cd17ecfc06e814b70ce1557067faee8e4472e` |
| `reference/mobile-1-family-neutral-390x844.png` | `5d5512101ba04906a39fcbea83aea933ea55afa22bb15ada24f6d51cbcd9d10b` |
| `reference/mobile-2-family-selected-390x844.png` | `99df430898b32b413ac933a0aa94fb23749d138e1d87977a8b7bd0fd53558faf` |
| `reference/mobile-3-action-revealed-390x844.png` | `7b82ee19ff1f9e29dc37a92243f6060a978cb0353d221a4820cb64efc415c729` |

## Repository representation

The repository authority contains:

- the binding Constitution;
- approval and scope records;
- the exact approved CSS source;
- approved implementation notes;
- the package manifest and checksums;
- the existing canonical Ponte Flow tokens and icon system.

Reference PNGs are approval evidence rather than production assets. The implementation must render from the approved components, code, tokens and real data; screenshots must never be shipped as UI.