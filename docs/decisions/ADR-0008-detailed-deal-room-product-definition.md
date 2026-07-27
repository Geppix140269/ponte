# ADR-0008 — Detailed Deal Room product definition accepted

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source issues:** #51 and #54

## Decision

The product owner accepts `PT-PRODUCT-2026-07-27-04-DEAL-ROOM-DETAILED-PRODUCT-DEFINITION-V1.md` as the governing detailed product definition for the Deal Room.

The accepted scope includes:

- the complete end-to-end journey and exception paths;
- the 21-surface MVP screen register;
- conceptual domain objects and invariants;
- role and permission matrix;
- lifecycle and state machines;
- stable weighted progress model;
- Deal Passport generation, provenance, visibility and dispute rules;
- first-release, second-release, later and excluded scope;
- product acceptance tests.

## Binding principles

- The master room coordinates one defined Deal.
- Private sub-rooms protect individual negotiations and workstreams.
- Master progress derives from the approved master procedure and is not an average of private sub-room percentages.
- AI may use only information visible to the requesting participant.
- Expiry and entitlement lapse preserve history in read-only form.
- Upgrade restores the same room without re-upload or re-admission.
- Deal Passport facts require attributable provenance and permission-controlled visibility.

## Consequence

Deal Room experience design may now proceed. Technical architecture and implementation remain unapproved until the design authority receives explicit product-owner approval.

## Implementation boundary

This ADR does not authorise code, schema, migration, Stripe, billing, deployment, charging or production action.
