**Activity objects are defined twice**

The `publish`, `fund`, and `transfer` activity objects are described once in the main sections (§6 Account, §7 Funding, §8 Publishing) and then again in §9 Realtime Stream. The stream versions have slightly more fields (they include `balance`) but the spec doesn't clearly flag that difference — it just re-describes the same shapes. A cleaner approach would be to define each activity object once, note which fields are stream-only, and reference that definition everywhere else.

**The `/info` response is described twice**

A partial version appears in §4 Node Info, and the full version is in Appendix C. The §4 version is described as if it's the real response shape, but it's actually incomplete — `fund.targeted`, `fund.internal_transfer`, per-kind fee structures, and detailed method fields are all missing from it. A reader following the main text has an inaccurate picture until they find Appendix C. These should be merged into one place.

**Authentication prerequisites are repeated**

The list of authenticated endpoints appears in §1 Overview and again as the opening of §5 Authentication. It adds no new information the second time.

**The handshake payload definition is stated twice**

In §5, the fields of the handshake payload are listed as a JSON object, and then immediately listed again as the array form used for signing: `[node, pubkey, origin, scope, created_at, expires_at]`. The array is what actually matters cryptographically — the JSON object is just the wire format. The relationship between the two could be stated once more clearly rather than presented as two separate definitions.

**Appendix B partially duplicates §7**

The targeted funding request in Appendix B is a superset of the §7 funding request — it just adds an optional `pubkey` field. But Appendix B re-states the whole request and response shape rather than saying "same as §7 with an additional optional `pubkey` field." The internal transfer response is similarly verbose when it could just describe the delta from the base case.

**The batch validity rules are split across §10 and Appendix D**

The core batch format and verification rules are in §10, but additional index metadata fields that affect how you'd verify a batch in practice (block height, count, burn amount) are tucked into Appendix D as optional extensions. Since burn amount is actually part of the validity check in §10 (`ceil(sum(abs(amount)) / 1000)` satoshis), splitting it across sections creates an incomplete picture in each place.

**A structural suggestion**

The appendices feel like an afterthought rather than a deliberate separation. Appendix A (kind registry) is genuinely reference material. But Appendices B, C, and D are really just continuations of the main protocol sections — they're not optional or supplementary, they're needed to implement the protocol correctly. Folding them back into the main sections they belong to, and reserving the appendix for truly optional or reference content, would make the document easier to follow linearly.
