CIP-01: Chronicle Node Protocol
===============================

This document defines the basic Chronicle node protocol that should be implemented by Chronicle nodes and clients. Later CIPs may extend these structures and flows with additional fields, messages, kinds, and features.

## 1. Overview

A Chronicle node exposes an HTTP API and an authenticated realtime stream.

Public routes:

* `GET /info`
* `POST /handshake`

Authenticated routes:

* `GET /account`
* `POST /fund`
* `POST /publish`
* `GET /stream`

A typical client flow is:

`GET /info` → `POST /handshake` → `GET /account` → `POST /fund` → `POST /publish`

`GET /stream` provides an authenticated realtime stream for account activity and, where supported by the node, accepted events and published batches.

Finally, the node publishes accepted events in anchored batch artifacts under `/published/...`.

## 2. Conventions

Unless otherwise specified:

* all timestamps are Unix timestamps in milliseconds;
* all monetary amounts are denominated in millisatoshis (`msats`);
* all pubkeys, event ids, transaction ids, hashes, and signatures are lowercase hex;
* all cryptographic hashes, signatures, and byte concatenations operate on raw bytes, not on hex strings.

When this document refers to JSON serialization, it means the compact UTF-8 JSON serialization of the specified value, with no extra whitespace or line breaks.

Nodes intended for browser-based clients SHOULD support CORS on all HTTP routes defined by this document. At minimum, they SHOULD allow `GET`, `POST`, and `OPTIONS`, and the `Content-Type` and `Authorization` headers. This recommendation applies only to HTTP routes. WebSocket connections are governed separately by the node’s origin policy.

## 3. Events

The only client-submitted protocol object is the orientation event.

`kind` identifies how the event’s `subject` is interpreted. For example, an event with kind `web:domain` and subject `example.com` is an orientation event about the domain `example.com`.

On the wire, an orientation event is encoded as:

```
[kind, subject, amount, pubkey, created_at, sig]
```

* `kind` is a canonical namespaced string identifying how `subject` is interpreted.
* `subject` is a kind-specific canonical identifier string.
* `amount` is a non-zero signed integer amount in millisatoshis. Its sign encodes directional orientation.
* `pubkey` is the signer’s x-only secp256k1 public key, encoded as exactly 64 lowercase hex characters.
* `created_at` is a Unix timestamp in milliseconds.
* `sig` is a BIP340 Schnorr signature, encoded as exactly 128 lowercase hex characters.

To obtain the event id, the client and node compute the SHA-256 of the compact UTF-8 JSON serialization of the following unsigned event payload:

```
[kind, subject, amount, pubkey, created_at]
```

The signature `sig` is a BIP340 Schnorr signature over the 32-byte event id. 

Each kind defines the meaning of `subject` and the canonical form it must take. Nodes advertise supported kinds in `GET /info`. Nodes that support a kind MUST validate `subject` according to that kind’s specification and reject invalid subjects.

## 4. Node info

`GET /info` returns basic node identity and advertised node policy.

Success response, with some fields omitted for brevity:

```json
{
  "name": "<node name>",
  "pubkey": "<node-pubkey-hex>",
  "fund": {
    "methods": [{ "method": "lightning" }, { "method": "bitcoin" }]
  },
  "publish": {
    "kinds": ["chronicle:event", "web:domain"]
  }
}
```

`pubkey` identifies the node and is used in the authentication handshake described in Section 5.

`fund.methods` lists the funding methods supported by the node for topping up the authenticated account balance.

`publish.kinds` lists the event kinds accepted by the node.

The full `GET /info` response shape is specified in Appendix B.

## 5. Authentication

An authenticated account is a node-local paying account identified by `pubkey`. Funding is credited to that account, and accepted charges are applied to that account. The event `pubkey` identifies the signer of an orientation event and MAY differ from the authenticated account `pubkey`.

Authentication for the authenticated routes defined by this document uses a mutual handshake. The client proves control of its account pubkey, and the node proves control of the pubkey it advertised in `GET /info`.

### `POST /handshake`

Request:

```json
{
  "handshake": {
    "node": "<node-pubkey-hex>",
    "pubkey": "<account-pubkey-hex>",
    "origin": "https://node.example.com",
    "scope": "read",
    "created_at": <unix timestamp in milliseconds>,
    "expires_at": <unix timestamp in milliseconds>
  },
  "sig": "<client's BIP340 Schnorr signature over the handshake payload hash>"
}
```

`handshake.node` MUST match the node pubkey advertised in `GET /info`.

Both client and node signatures are BIP340 Schnorr signatures over the 32-byte SHA-256 of the handshake payload. The handshake payload is the compact UTF-8 JSON serialization of:

```
[node, pubkey, origin, scope, created_at, expires_at]
```

Success response:

```json
{
  "token": "<opaque-token>",
  "sig": "<node's BIP340 Schnorr signature over the same handshake payload hash>"
}
```

The token is an opaque bearer token bound by the node to exactly one account, one scope, and one expiry, which it inherits from the accepted handshake.

Authenticated HTTP requests use `Authorization: Bearer <token>`. Stream authentication uses the same token in the `token` query parameter: `GET /stream?token=<token>`.

`scope` is either `read` or `write`. `read` permits account reads and realtime streams. A node MAY charge for some read operations such as optional streams. `write` also permits event publication and other write operations that consume account balance.

The node MAY reject a handshake whose `created_at` or `expires_at` violates node policy.

## 6. Account

`GET /account` returns account state for the authenticated account and may be used by clients to bootstrap account UI.

Success response:

```json
{
  "balance": 742000
}
```

A node MAY also include recent account activity, ordered newest first.

```json
{
  "balance": 742000,
  "activity": [
    {
      "type": "fund",
      "method": "lightning",
      "status": "settled",
      "amount": 500000,
      "created_at": 1731088800456,
      "ref": "<funding-ref>"
    },
    {
      "type": "publish",
      "event_amount": 1900,
      "fee": 15,
      "amount": -1915,
      "created_at": 1731088810123,
      "event_id": "<event-id-hex>",
      "receipt": "<node-schnorr-signature-over-event-id>"
    }
  ]
}
```

In account activity objects, `amount` is the signed balance delta applied to the authenticated account. For `publish` activity objects, `event_amount` is the absolute value of the event’s signed orientation amount, in millisatoshis.

If a node includes recent account activity in `/account`, that activity is bounded by node policy and is intended only for lightweight UI rendering and recent recovery. It is not a general history API. Clients that require long-term recovery or reconciliation SHOULD persist funding references, invoices or addresses, event ids, and receipts rather than relying on `/account` activity retention.

## 7. Funding

`POST /fund` creates funding instructions for the authenticated account. Optional extensions are described in Appendix C.

Request:

```json
{
  "method": "lightning",
  "amount": 500000,
  "units": "msats"
}
```

`method` identifies the funding method. This document defines `lightning` and `bitcoin`. Additional funding methods may be defined elsewhere. 

`amount` is the requested funding amount in the units specified by `units`.
For lightning, units MUST be `msats`. For bitcoin, units MUST be `sats`.

For `lightning`, a successful response returns a BOLT11 invoice.

```json
{
  "method": "lightning",
  "requested_amount": 500000,
  "requested_units": "msats",
  "ref": "<funding-ref>",
  "expires_at": 1731089400456,
  "invoice": "<bolt11>"
}
```

For `bitcoin`, a successful response returns a Bitcoin address.

```json
{
  "method": "bitcoin",
  "requested_amount": 50000,
  "requested_units": "sats",
  "ref": "<funding-ref>",
  "expires_at": 1731089400456,
  "address": "<bitcoin-address>"
}
```

`requested_amount` is the amount requested by the client when the funding instruction is created. When the node later observes payment for that funding reference, it decides how to credit the target account balance.

For `lightning`, the credited amount is typically determined by the settled invoice amount.

For `bitcoin`, if the observed amount differs from `requested_amount`, a node MAY credit the observed amount, the requested amount, or no amount at all, depending on node policy.

`expires_at` defines the time after which the node is no longer required to honor the funding instruction.

## 8. Publishing

`POST /publish` submits a signed orientation event to the node for acceptance and later publication.

Request:

```json
{
  "event": [kind, subject, amount, pubkey, created_at, sig]
}
```

The event `pubkey` identifies the signer of the event and MAY differ from the authenticated account `pubkey`.

The node accepts the event only if:

* it supports the event kind
* the event is well-formed
* the event signature is valid
* the event amount and timestamp satisfy node policy
* the authenticated account has sufficient balance
  
If the event is accepted, the node charges the authenticated account and returns a publish activity object.

Success response:

```json
{
  "event_amount": <integer, absolute value of the event's signed orientation amount, in msats>,
  "fee": <integer, node fee in msats>,
  "amount": <integer, signed balance delta applied to the authenticated account, negative>,
  "balance": <integer, resulting balance in msats>,
  "created_at": <integer, unix timestamp in milliseconds>,
  "event_id": "<event-id-hex>",
  "receipt": "<node-schnorr-signature-over-event-id>"
}
```

Duplicate publish requests MUST be detected by event id. If the event id has already been accepted by the node, the node MUST NOT apply a second charge and SHOULD return the original publish activity object.

`receipt` is the node’s BIP340 Schnorr signature over the 32-byte `event_id`. A receipt is the node’s signed acknowledgement that it accepted the event, charged the authenticated account for it, and assumed responsibility for later publication of that event. A receipt proves acceptance by the node. It does not by itself prove that the event was later batched, anchored, or published under `/published/...`.

## 9. Realtime stream

`GET /stream` upgrades to an authenticated WebSocket connection. The client passes the bearer token returned by `POST /handshake` in the `token` query parameter and may select one or more streams with the `streams` query parameter.

```
GET /stream?token=<token>&streams=event,batch,account
```

If `streams` is omitted, the node subscribes the client to `account` only.
 
This document defines the following streams:

* `event`, which emits accepted events and their receipt.
* `batch`, which emits published batch announcements.
* `account`, which emits authenticated account activity.

Nodes MUST support the `account` stream. Nodes MAY additionally support the `event` and `batch` streams.

### `event`

An `event` message has the form:

```json
["event", {
  "event": [kind, subject, amount, pubkey, created_at, sig],
  "receipt": "<node's BIP340 Schnorr signature over the raw 32-byte event id>"
}]
```

If a client is subscribed to `event`, the node MUST emit an `event` message when an event is accepted. A duplicate publish that does not create a new charge SHOULD NOT emit a second `event` message.

`receipt` has the same meaning as in Section 8.

### `batch`

A `batch` message has the form:

```json
["batch", {
  "root": "<batch-root-hex>",
  "txid": "<anchor-txid>",
  "vout": <integer, anchor output index>,
  "url": "/published/<root>.json"
}]
```

The node MUST emit a `batch` message when a new batch artifact is published.

### `account`

An `account` message is an account activity object. If the activity changes account balance, the message MUST include the resulting `balance`.

A `fund` activity object has the form:

```json
{
  "type": "fund",
  "method": "<lightning|bitcoin>",
  "status": "<created|settled|expired>",
  "created_at": <integer, unix timestamp in milliseconds>,
  "ref": "<funding-ref>"
}
```

Additional fields depend on `status`. `created` includes `requested_amount` and `requested_units`. `settled` includes `amount` and the resulting `balance`. `expired` adds no additional fields.

If the client is subscribed to `account`, the node MUST emit a fund activity when funding is settled. A node SHOULD emit fund activity when funding is created, and MAY also emit it when funding is expired.

A `publish` activity object on the account stream has the same fields as the publish activity object returned by `POST /publish`, with the additional `type` field set to `"publish"`.

If the client is subscribed to `account`, the node MUST emit a `publish` activity when an event charge is applied. A duplicate publish that does not create a new charge MUST NOT emit a second `publish` activity.

## 10. Publication

`/published/...` is a public static publication directory, not a REST API. Accepted events are batched deterministically, anchored to Bitcoin, and published there as batch artifacts.

A published batch artifact has the form:

```json
{
  "root": "<batch-root-hex>",
  "node": "<node-pubkey-hex>",
  "txid": "<anchor-txid>",
  "vout": <integer, anchor output index>,
  "events": [
    [kind, subject, amount, pubkey, created_at, sig]
  ]
}
```

Events in a batch are ordered by `created_at` ascending, with `event_id` as the tie-breaker in lexical order.

For each event, the node computes `event_id` as defined in Section 3.

The node builds a Merkle tree over the ordered raw 32-byte event ids. Each leaf is one raw 32-byte `event_id`. Each parent node is `sha256(left || right)` over raw bytes. If a Merkle tree level has an odd number of nodes, the final node is duplicated.

The resulting Merkle root is `events_root`.

The node then computes the batch root over raw bytes:

```
root = sha256(events_root || node_pubkey)
```

where `node_pubkey` is the raw 32-byte x-only public key advertised by the node.

The anchor output is the transaction output identified by `txid` and `vout`. It MUST be an `OP_RETURN` output whose pushed data is the raw 32-byte `root`, and whose output value is at least the required burn in satoshis.

A batch is valid only if:

* the batch ordering is correct
* the `root` is correctly derived from the ordered events and the node pubkey
* the anchor output destroys at least `ceil(sum(abs(amount)) / 1000)` satoshis

`/published/index.json` lists published batches newest first. It has the form:

```json
{
  "batches": [
    {
      "root": "<batch-root-hex>",
      "node": "<node-pubkey-hex>",
      "txid": "<anchor-txid>",
      "vout": <integer, anchor output index>,
      "url": "/published/<root>.json"
    }
  ]
}
```

Published batch artifacts are public. Anyone may download them and verify the batch ordering, Merkle root, batch root, and Bitcoin anchor.

***

# Appendix

The appendices collect the parts of the protocol that are useful for implementation and extension but are not required to follow the main protocol flow: subject validation and the external kind registry model, the full `GET /info` response shape, optional funding extensions, optional stream policy and billing, publication metadata extensions, and recommended error codes.

## A. Kind registry and subject validation

Kind definitions and registry management are external to CIP-01. Example kind specifications are published in the Chronicle kind registry, including [chronicle:event](./registry/kinds/chronicle/event/v1.0.0/spec.md), [chronicle:node](./registry/kinds/chronicle/node/v1.0.0/spec.md), and [email:address](./registry/kinds/email/address/v1.0.0/spec.md).

This appendix does not define the kind registry or any kind specifications. It defines only the high-level protocol rules that apply to kind-specific subject validation and discovery.

`subject` MUST be a canonical identifier string for the event `kind`. It is not a freeform content field.

Each kind specification defines the meaning of `subject`, the canonical form it must take, and any additional validation rules.

Nodes that support a kind MUST validate `subject` according to that kind’s specification and reject invalid subjects.

Nodes MUST enforce a maximum `subject` length. The limit is node policy and SHOULD be advertised in `GET /info`.

For kinds whose subjects admit multiple textual encodings of the same underlying subject, nodes SHOULD accept only the canonical encoding defined by that kind and reject equivalent alternate encodings.

Nodes advertise supported kinds in `GET /info`.

## B. `GET /info` documentation

This appendix documents the full `GET /info` response. Section 4 shows only an abbreviated example.

### Example response

```json
{
  "name": "example-node",
  "pubkey": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "contact": "mailto:admin@example.com",
  "fund": {
    "methods": [
      {
        "method": "lightning",
        "units": "msats",
        "min_amount": 1000,
        "max_amount": 100000000
      }
    ]
  },
  "publish": {
    "kinds": [
      {
        "kind": "chronicle:event",
        "spec": "https://chronicle-network.org/registry/kinds/chronicle/event/v1.0.0/spec.md"
      }
    ],
    "min_amount": 1000,
    "max_amount": 1000000,
    "max_subject_length": 320,
    "fees": [
      {
        "kind": "*",
        "base": 100,
        "ppm": 10000
      }
    ],
    "timestamp_past_skew": 30000,
    "timestamp_future_skew": 30000
  },
  "stream": {
    "supported": ["event", "batch"],
    "fees": [
      {
        "stream": "event",
        "amount": 1000,
        "period": 3600000
      }
    ]
  }
}
```

### Field descriptions

* `name` (`string`, required): Human-readable node name.
* `pubkey` (`string`, required): Node x-only secp256k1 public key used to verify the node signature returned by `POST /handshake`.
* `contact` (`string`, required): Administrative contact URI, such as `mailto:` or `https:`.
* `fund` (`object`, required): Funding policy object.
* `fund.methods` (`array`, required): Supported funding methods. MUST be non-empty.
* `fund.methods[].method` (`string`, required): Funding method identifier, such as `lightning` or `bitcoin`.
* `fund.methods[].units` (`string`, required): Funding units for the method, such as `msats` or `sats`.
* `fund.methods[].min_amount` (`integer`, optional): Minimum requested funding amount supported by this method.
* `fund.methods[].max_amount` (`integer`, optional): Maximum requested funding amount supported by this method.
* `fund.targeted` (`boolean`, optional): Whether the node supports targeted funding as described in Appendix C. If omitted, clients MUST treat it as `false`.
* `fund.internal_transfer` (`boolean`, optional): Whether the node supports internal account-to-account transfer as described in Appendix C. If omitted, clients MUST treat it as `false`.
* `publish` (`object`, required): Publish policy object.
* `publish.kinds` (`array`, required): Supported kind descriptors. MUST be non-empty.
* `publish.kinds[].kind` (`string`, required): Canonical kind identifier.
* `publish.kinds[].spec` (`string`, required): Absolute URL or path to the kind specification.
* `publish.min_amount` (`integer`, optional): Minimum publish amount in msats.
* `publish.max_amount` (`integer`, optional): Maximum publish amount in msats.
* `publish.max_subject_length` (`integer`, required): Maximum allowed subject length in characters.
* `publish.fees` (`array`, required): Publish fee schedule. MUST be non-empty.
* `publish.fees[].kind` (`string`, required): Kind selector for the fee rule. `*` applies to all kinds not matched more specifically.
* `publish.fees[].base` (`integer`, required): Fixed publish fee in msats. MUST be a positive non-zero integer.
* `publish.fees[].ppm` (`integer`, required): Variable publish fee rate in parts per million of the event amount.
* `publish.timestamp_past_skew` (`integer`, required): Maximum permitted event age in milliseconds.
* `publish.timestamp_future_skew` (`integer`, required): Maximum permitted future timestamp skew in milliseconds.
* `stream` (`object`, optional): Optional stream policy object.
* `stream.supported` (`array`, optional): Optional streams supported by the node beyond `account`.
* `stream.fees` (`array`, optional): Fee schedule for optional streams. See Appendix D for billing semantics.
* `stream.fees[].stream` (`string`, required): Optional stream identifier, such as `event` or `batch`.
* `stream.fees[].amount` (`integer`, required): Stream access charge in msats.
* `stream.fees[].period` (`integer`, required): Duration of paid access in milliseconds.

The publish fee schedule is part of the node’s signal policy, not merely a revenue mechanism. In particular, a positive non-zero base fee helps prevent fragmentation of orientation across many tiny events.

Clients MUST ignore unknown fields.

## C. Funding extensions

Nodes MAY extend `POST /fund` to support funding accounts other than the authenticated account. This can be used for gifting, delegated funding, or external services that top up Chronicle accounts on behalf of users.

If `GET /info` includes `"targeted": true` under `fund`, the node supports targeted funding. In a targeted funding request, `pubkey` identifies the account to credit. If `pubkey` is omitted, the authenticated account is credited.

Request:

```json
{
  "pubkey": "<target account pubkey>",
  "method": "lightning",
  "amount": 500000,
  "units": "msats"
}
```

Response:

```json
{
  "method": "lightning",
  "requested_amount": 500000,
  "requested_units": "msats",
  "ref": "<funding-ref>",
  "expires_at": 1731089400456,
  "invoice": "<bolt11>",
  "target_pubkey": "<target account pubkey>"
}
```

The authenticated account MAY receive `fund` activity objects on the `account` stream for the funding instruction it created, as described in Section 9. The credited account SHOULD receive the `settled` `fund` activity, because its balance has changed.

A node MAY also support internal account-to-account transfer.

If `GET /info` includes `"internal_transfer": true` under `fund`, the node supports internal transfer. An internal transfer moves balance from the authenticated account to another existing account on the same node.

An internal transfer is requested with `POST /fund` by omitting `method` and specifying a different target account `pubkey`.

Request:

```json
{
  "pubkey": "<target account pubkey>",
  "amount": <integer, amount in msats>
}
```

A node SHOULD reject an internal transfer if the target account equals the authenticated account or the authenticated account has insufficient balance.

A successful internal transfer debits the authenticated account and credits the target account exactly once.

Success response:

```json
{
  "ref": "<transfer-ref>",
  "source_pubkey": "<source account pubkey>",
  "target_pubkey": "<target account pubkey>",
  "amount":  <integer, signed balance delta applied to the authenticated account, negative>,
  "balance": <integer, resulting balance in msats>,
  "created_at":  <integer, unix timestamp in milliseconds>
}
```

A `transfer` activity object on the `account` stream has the same fields, with the additional `type` field set to `"transfer"`.

The source account and the target account each receive a `transfer` activity object on the `account` stream. `amount` is the signed balance delta applied to the account receiving that message. It is negative for the debited source account and positive for the credited target account. `balance` is the resulting balance of the account receiving that message.

If the client is subscribed to the `account` stream, the node MUST emit the corresponding `transfer` activity when the transfer is applied.

## D. Stream policy and billing

This appendix defines the meaning of the `stream.supported` and `stream.fees` fields documented in Appendix B.

Nodes MUST support the `account` stream and MUST NOT charge for it. Nodes MAY additionally support the `event` and `batch` streams.

Paid stream access is granted per authenticated account, per stream, for a bounded period. Reconnection or additional connections during an active paid period MUST NOT create an additional charge for the same account and stream.

If a client requests multiple paid streams, the node charges independently for each stream whose paid access period is not already active.

If a supported optional stream is omitted from `stream.fees`, it is free. A node MAY include a zero-valued fee entry for explicitness.

A `stream` activity object has the form:

```json
{
  "type": "stream",
  "stream": "<event|batch>",
  "amount": <integer, signed balance delta applied to the authenticated account, negative>,
  "balance": <integer, resulting balance in msats>,
  "period_start": <integer, unix timestamp in milliseconds>,
  "period_end": <integer, unix timestamp in milliseconds>
}
```

If the client is subscribed to the `account` stream, the node MUST emit a `stream` activity when a stream charge is applied.


## E. Publication metadata extensions

Section 10 defines the required core fields for each batch entry in `/published/index.json`:

```json
{
  "root": "<batch-root-hex>",
  "node": "<node-pubkey-hex>",
  "txid": "<anchor-txid>",
  "vout": <integer, anchor output index>,
  "url": "/published/<root>.json"
}
```

A batch entry in `/published/index.json` SHOULD also include:

* `height`, the Bitcoin block height of the anchoring transaction
* `count`, the number of events in the batch
* `burn`, the number of satoshis destroyed by the anchor output.
* `from`, the earliest `created_at` in the batch
* `to`, the latest `created_at` in the batch

These metadata fields MAY also be included in `batch` stream messages. When present, they carry the same meaning.

Example:

```json
{
  "batches": [
    {
      "root": "<batch-root-hex>",
      "txid": "<anchor-txid>",
      "vout": 0,
      "url": "/published/<root>.json",
      "height": 870000,
      "count": 128,
      "burn": 4567,
      "from": 1731088800456,
      "to": 1731089900123
    }
  ]
}
```

Nodes MAY include additional metadata fields in `index.json`. Unknown fields MUST be ignored by clients.

## F. Errors and policy recommendations

Nodes reject requests that violate this protocol or node policy. Advertised policy values in `GET /info` apply to funding, publishing, optional funding extensions, and optional streams.

Nodes SHOULD use stable machine-readable error codes so clients can handle errors programmatically.

Exact HTTP status codes, WebSocket close behavior, and human-readable messages are left to each implementation.

Example error response:

```json
{
  "error": {
    "code": "invalid_signature",
    "message": "signature does not verify"
  }
}
```

Recommended authentication error codes:

* `invalid_handshake`
* `handshake_expired`
* `invalid_scope`
* `invalid_signature`
* `invalid_token`

Recommended funding error codes:

* `unsupported_method`
* `invalid_amount`
* `invalid_units`

Recommended funding extension error codes:

* `invalid_account`
* `self_transfer`
* `insufficient_balance`

Recommended publishing error codes:

* `invalid_event`
* `invalid_subject`
* `subject_too_long`
* `invalid_signature`
* `invalid_amount`
* `insufficient_balance`
* `unsupported_kind`
* `timestamp_out_of_range`

Recommended stream error codes:

* `invalid_token`
* `unsupported_stream`
* `insufficient_balance`
