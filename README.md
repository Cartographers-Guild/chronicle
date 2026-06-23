# Chronicle

An open protocol for public trust and accountability on the web.

The internet made information cheap to publish and distribute. It also made signals cheap to fake: spam emails, fake reviews, bot accounts, scam domains, synthetic content, and disposable identities now litter the web.

Chronicle is an attempt to create a public evidence layer for digital trust.

It lets actors publish signed orientation events toward or away from digital subjects such as websites, email addresses, phone numbers, accounts, messages, nodes, and prior events. Publishing an event requires sacrificing a chosen amount of monetary value, making the signal costly, public, and accountable.

Clients can use the resulting graph to compute their own trust, reputation, and ranking signals.

Chronicle is not a new blockchain. Events live off-chain. Bitcoin is used as a public, verifiable anchor for irreversible sacrifice.

## Status

Chronicle is still early. This repository is currently focused on protocol design.

The most useful contribution right now is careful review. If you see a flaw, have a question, or want to suggest a refinement, please open a GitHub issue.

Useful places to start:

* the [whitepaper](https://chronicle-network.org/public/chronicle.pdf)
* the [protocol specification](./CIP-01.md)
* the [event kind registry](https://chronicle-network.org/registry/)
* [essays developing the reasoning behind the design](https://cartographersguild.substack.com/p/geometry-of-action)

The next step is to build working node software, client integrations, and small experiments that stress-test the design in real contexts.

## How it works

Chronicle has one core primitive: an orientation event.

An event says that a public actor is orienting toward or away from a specific subject with a chosen amount of costly signal.

For example:

```json
["web:domain", "scam.shop", -1000, "bob_pub", 1731088810123, "bob_sig"]
```

This means Bob is orienting against `scam.shop` with 1000 millisatoshis of signal.

Chronicle nodes accept signed events, charge the publishing account, batch accepted events, anchor the batch to Bitcoin, and publish the resulting batch artifacts publicly.

Anyone can verify the published events, their ordering, their batch roots, and their Bitcoin anchors from public data.

Clients can then compute trust and reputation from the public graph.

## The PageRank intuition

Chronicle generalizes the intuition behind PageRank.

A link from one page to another was a small act of orientation. A page became important when many pages linked to it, or when a few already-important pages linked to it. Importance flowed recursively through the graph.

Chronicle replaces the link with a signed, costly orientation event.

Events can be positive or negative. They can point to many kinds of subjects. They can also point to prior events, which means the graph can judge not only actors, but specific actions, which enables error-correction and recursive accountability.

A signal from a credible actor can carry more weight than a signal from an unknown or low-reputation actor. Credibility itself can be computed from how others have oriented toward that actor and their past events.

## Protocol specification

The current public specification surface includes:

* [CIP-01.md](./CIP-01.md) for the Chronicle node protocol
* [registry/](./registry/) for the current kind and type registry

`CIP-01` defines the core node protocol, including:

* orientation events
* authentication
* funding
* publishing
* realtime streams
* batch publication
* Bitcoin anchoring
* validation rules

The registry defines canonical subject kinds and value types.

Current registry kinds include:

* [chronicle:event](./registry/kinds/chronicle/event/v1.0.0/spec.md)
* [chronicle:node](./registry/kinds/chronicle/node/v1.0.0/spec.md)
* [chronicle:pubkey](./registry/kinds/chronicle/pubkey/v1.0.0/spec.md)
* [email:address](./registry/kinds/email/address/v1.0.0/spec.md)
* [email:message](./registry/kinds/email/message/v1.0.0/spec.md)
* [email:verify](./registry/kinds/email/verify/v1.0.0/spec.md)
* [web:domain](./registry/kinds/web/domain/v1.0.0/spec.md)
* [web:url](./registry/kinds/web/url/v1.0.0/spec.md)
* [web:verify](./registry/kinds/web/verify/v1.0.0/spec.md)
* [phone:number](./registry/kinds/phone/number/v1.0.0/spec.md)
* [phone:verify](./registry/kinds/phone/verify/v1.0.0/spec.md)
* [nostr:event](./registry/kinds/nostr/event/v1.0.0/spec.md)
* [nostr:pubkey](./registry/kinds/nostr/pubkey/v1.0.0/spec.md)
* [nostr:relay](./registry/kinds/nostr/relay/v1.0.0/spec.md)

Current registry types include:

* [absolute_url](./registry/types/absolute_url/v1.0.0/spec.md)
* [domain_name](./registry/types/domain_name/v1.0.0/spec.md)
* [email_address](./registry/types/email_address/v1.0.0/spec.md)
* [email_message_fingerprint](./registry/types/email_message_fingerprint/v1.0.0/spec.md)
* [phone_number](./registry/types/phone_number/v1.0.0/spec.md)
* [schnorr_pubkey](./registry/types/schnorr_pubkey/v1.0.0/spec.md)
* [sha256_hex](./registry/types/sha256_hex/v1.0.0/spec.md)
* [websocket_url](./registry/types/websocket_url/v1.0.0/spec.md)

## What Chronicle is not

Chronicle is not trying to replace reviews, moderation, or platform-specific reputation systems.

It aims to become a signal layer these systems can integrate with when ranking content, filtering spam, and reducing noise.

## Contributing

Chronicle is being developed in public, and critique is welcome.

The most useful contributions right now are:

* review the protocol specification
* review existing event kinds
* propose new kinds for the registry
* point out failure modes
* compare Chronicle to prior art
* build a small client or node prototype
* open an issue with a question, objection, idea, or refinement

If you want to collaborate more directly, get in touch.

## Links

* [Website](https://chronicle-network.org/)
* [Whitepaper](https://chronicle-network.org/public/chronicle.pdf)
* [Protocol specification](https://github.com/cartographers-guild/chronicle/blob/main/CIP-01.md)
* [Theory](https://cartographersguild.substack.com/p/geometry-of-action)
