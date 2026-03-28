# CIP-01: Chronicle Node Protocol

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

## 3. Events

The only client-submitted protocol object is the orientation event.

On the wire, an orientation event is encoded as:

```
[kind, subject, amount, pubkey, created_at, sig]
```

* `kind` is a canonical namespaced string identifying how `subject` is interpreted.
* `subject` is a kind-specific canonical identifier string.
* `amount` is a non-zero signed integer amount in millisatoshis.
* `pubkey` is the signer’s x-only secp256k1 public key, encoded as exactly 64 lowercase hex characters.
* `created_at` is a Unix timestamp in milliseconds.
* `sig` is a BIP340 Schnorr signature, encoded as exactly 128 lowercase hex characters.

To obtain the event id, the client and node compute the SHA-256 of the compact UTF-8 JSON serialization of the following unsigned event payload:

```
[kind, subject, amount, pubkey, created_at]
```

The signature `sig` is a BIP340 Schnorr signature over the 32-byte event id. 

Nodes that support a kind MUST validate `subject` against that kind’s canonical form and reject invalid subjects. The initial kind registry is defined in Appendix A.

## 4. Node info

`GET /info` returns basic node identity and advertised node policy.

Success response:

```json
{
  "name": "<node name>",
  "pubkey": "<node-pubkey-hex>",
  "contact": "<contact-uri>",
  "fund": {
    "methods": [{ "method": "lightning" }, { "method": "bitcoin" }]
  },
  "publish": {
     "kinds": ["chronicle:event", "chronicle:node", "email:address", "web:domain"],
    "min_amount": <min publish amount in msats>,
    "max_amount": <max publish amount in msats>,
    "max_subject_length": <maximum subject length in characters>,
    "timestamp_past_skew": <maximum age in milliseconds>,
    "timestamp_future_skew": <maximum future skew in milliseconds>,
    "fees": [{ "base": <base fee in msats>, "ppm": <fee rate in parts per million> }]
  },
  "stream": {
    "supported": ["event", "batch"],
    "fees": [{ "stream": "event", "amount": <amount in msats>, "period": <period in milliseconds> }]
  }
}
```

Nodes MUST support the `account` stream and MUST NOT charge for it.

`fund`, `publish`, and `stream` MAY include additional node policy fields. Unknown fields MUST be ignored by clients.

The full `GET /info` response shape is specified in Appendix C.

## 5. Authentication

Authentication is required for:

* `GET /account`
* `POST /fund`
* `POST /publish`
* `GET /stream`

An authenticated account is a node-local paying account identified by `pubkey`. Funding is credited to that account, and that account is charged for accepted events.

The event `pubkey` identifies the signer of the orientation event and may differ from the authenticated account `pubkey`.

Authentication uses a mutual handshake. The client proves control of its account pubkey, and the node proves control of the pubkey it advertised in `GET /info`.

The client sends a signed handshake request to `POST /handshake`. If the node accepts the proposed handshake, it returns a bearer token and its own signature over the same handshake payload. Otherwise it rejects the request. 

Authenticated HTTP requests use `Authorization: Bearer <token>`. WebSocket authentication uses the same token in the `token` query parameter: `GET /stream?token=<token>`

`scope` is either `read` or `write`. `read` permits account reads and realtime streams. A node MAY charge for some read operations such as optional streams. `write` also permits event publication and other write operations that consume account balance.

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

`pubkey` identifies the client account pubkey against which the client signature is verified. `handshake.node` MUST match the node pubkey advertised in `GET /info`. 

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

The node MAY reject a handshake whose `created_at` or `expires_at` violates node policy.

## 6. Account

`GET /account` returns account state for the authenticated account and may be used by clients to bootstrap account UI.

Success response:

```json
{
  "balance": 742000
}
```

A node MAY also include bounded recent account activity, ordered newest first.

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

If a node includes recent account activity in `/account`, that activity is bounded by node policy and is intended only for lightweight UI rendering and recent recovery. It is not a general history API.

## 7. Funding

`POST /fund` creates funding instructions for the authenticated account. Optional extensions are described in Appendix B.

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

* the event is well-formed
* the event signature is valid
* the event amount and timestamp satisfy node policy
* the authenticated account has sufficient balance
* the event is not a duplicate

A duplicate publish MUST be detected by event id and MUST NOT create a second charge.

If the event is accepted, the node charges the authenticated account and returns a publish activity object.

Success response:

```json
{
  "type": "publish",
  "event_amount": <integer, absolute value of the event's signed orientation amount, in msats>,
  "fee": <integer, node fee in msats>,
  "amount": <integer, signed balance delta applied to the authenticated account, negative>,
  "created_at": <integer, unix timestamp in milliseconds>,
  "event_id": "<event-id-hex>",
  "receipt": "<node-schnorr-signature-over-event-id>"
}
```

`receipt` is the node’s BIP340 Schnorr signature over the 32-byte `event_id`.

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

If a client is subscribed to `event`, the node MUST emit an `event` message when an event is accepted.

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

If the client is subscribed to `account`, the node MUST emit a fund activity when funding is settled. A node MAY also emit fund activity when funding is created or expired.

Activity object for `publish`:

```json
{
  "type": "publish",
  "event_amount": <integer, absolute value of the event's signed orientation amount, in msats>,
  "fee": <integer, node fee in msats>,
  "amount": <integer, signed balance delta applied to the authenticated account, negative>,
  "balance": <integer, resulting balance in msats>,
  "created_at": <integer, unix timestamp in milliseconds>,
  "event_id": "<event-id-hex>",
  "receipt": "<node-schnorr-signature-over-event-id>"
}
```

If the client is subscribed to `account`, the node MUST emit a `publish` activity when an event charge is applied.

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

The appendices collect the parts of the protocol that are useful for implementation and extension but are not required to follow the main protocol flow: the initial kind registry, optional funding and transfer extensions, optional stream billing and the full `/info` response shape, publication metadata extensions, and recommended error codes.

## A. Kind registry and subject validation

`subject` identifies the subject of an orientation event, such as a public key, domain, URL, email address, or transaction id. 

`subject` MUST be a canonical identifier string for the event `kind`. It is not a freeform content field.

Nodes that support a kind MUST validate `subject` against that kind’s canonical form and reject invalid subjects.

Nodes MUST enforce a maximum `subject` length. The limit is node policy and SHOULD be advertised in `GET /info`.

This document defines only the specific kind identifiers listed below. Other identifiers in the same namespace are not implied.

Where a kind below refers to a public key, `subject` is a lowercase 64-character hex secp256k1 x-only public key.

Where a kind below refers to an event id, transaction id, or SHA-256 digest, `subject` is lowercase 64-character hex.

The following initial kind registry is proposed:

* `chronicle:event`: `subject` is a Chronicle event id.
* `chronicle:node`: `subject` is a public key identifying a Chronicle node.
* `pubkey`: `subject` is a public key.
* `nostr:pubkey`: `subject` is a public key identifying a Nostr account.
* `nostr:event`: `subject` is a Nostr event id.
* `nostr:relay`: `subject` is a canonical relay URL.
* `web:domain`: `subject` is a normalized lowercase ASCII domain name, without scheme, path, query, fragment, or port.
* `web:url`: `subject` is a canonical absolute URL.
* `email:address`: `subject` is a normalized email address.
* `phone:number`: `subject` is a normalized `+`-prefixed digits-only telephone number.
* `bitcoin:txid`: `subject` is a Bitcoin transaction id.
* `content:sha256`: `subject` is a SHA-256 digest of external content.

Nodes SHOULD reject non-canonical encodings even when they identify the same underlying subject.

Kinds defined by this document identify external subjects or compact cryptographic references. They do not embed the underlying content.

## B. Third-party funding and internal transfer

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

The initiating account receives `fund` activity objects on the `account` stream as described in the realtime stream section. The credited account SHOULD receive the `settled` `fund` activity, because its balance has changed.

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

The source account and the target account each receive a `transfer` activity object. `amount` is the signed balance delta applied to the account receiving that message. It is negative for the debited source account and positive for the credited target account. `balance` is the resulting balance of the account receiving that message.

`transfer` activity object:

```json
{
  "type": "transfer",
  "ref": "<transfer-ref>",
  "source_pubkey": "<source account pubkey>",
  "target_pubkey": "<target account pubkey>",
  "amount": -500000,
  "balance": 742000,
  "created_at": 1731088820000
}
```

If the client is subscribed to the `account` stream, the node MUST emit the corresponding `transfer` activity when the transfer is applied.

## C. Stream policy, billing, and full `/info` response

Nodes MUST support the `account` stream and MUST NOT charge for it. Nodes MAY additionally support the `event` and `batch` streams.

Paid stream access is granted per authenticated account, per stream, for a bounded period. Reconnection or additional connections during an active paid period MUST NOT create an additional charge for the same account and stream.

If a client requests multiple paid streams, the node charges independently for each stream whose access period is not already active.

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

The full `GET /info` response shape is:

```json
{
  "name": "<node name>",
  "pubkey": "<node-pubkey-hex>",
  "contact": "<contact-uri>",
  "fund": {
    "methods": [
      {
        "method": "lightning",
        "units": "msats",
        "min_amount": <minimum funding amount in msats>,
        "max_amount": <maximum funding amount in msats>
      },
      {
        "method": "bitcoin",
        "units": "sats",
        "min_amount": <minimum funding amount in sats>,
        "max_amount": <maximum funding amount in sats>
      }
    ],
    "targeted": <bool, allow funding another account>,
    "internal_transfer": <bool, allow internal transfer to another account>
  },
  "publish": {
    "kinds": ["chronicle:event", "chronicle:node", "email:address", "web:domain"],
    "min_amount": <minimum publish amount in msats>,
    "max_amount": <maximum publish amount in msats>,
    "max_subject_length": <maximum subject length in characters>,
    "fees": [
      {
        "kind": "*",
        "base": <base fee in msats>,
        "ppm": <fee rate in parts per million>
      }
    ],
    "timestamp_past_skew": <maximum age in milliseconds>,
    "timestamp_future_skew": <maximum future skew in milliseconds>
  },
  "stream": {
    "supported": ["event", "batch"],
    "fees": [
      {
        "stream": "event",
        "amount": <amount in msats>,
        "period": <period in milliseconds>
      },
      {
        "stream": "batch",
        "amount": <amount in msats>,
        "period": <period in milliseconds>
      }
    ]
  }
}
```

`stream.supported` lists only optional streams beyond `account`.

`fund`, `publish`, and `stream` MAY include additional node policy fields. Unknown fields MUST be ignored by clients.

## D. Publication metadata extensions

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

## E. Errors and policy recommendations

Nodes reject requests that violate this protocol or node policy. Policy values advertised in `GET /info` apply to funding, publishing, and optional streams.

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
* `invalid_signature`
* `invalid_token`

Recommended funding error codes:

* `unsupported_method`
* `invalid_amount`

Recommended publishing error codes:

* `invalid_event`
* `invalid_signature`
* `invalid_amount`
* `insufficient_balance`
* `duplicate`
* `unsupported_kind`
* `timestamp_out_of_range`

Recommended stream error codes:

* `invalid_token`
* `unsupported_stream`
