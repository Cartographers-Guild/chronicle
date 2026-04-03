# Chronicle

An open protocol for costly orientation and trust signaling on the internet.

Chronicle lets people publish signed orientations backed by publicly verifiable sacrifice. Instead of relying only on cheap likes, ratings, reviews, or platform-local reputation, Chronicle creates a public graph of costly digital action that clients can use to compute trust, reputation, and other signals from shared evidence. The core idea and motivation are laid out in the whitepaper, [Bringing Trust and Accountability to the Web](./public/chronicle.pdf), and the broader philosophical context appears in the essay, [Compass for the Good](https://cartographersguild.substack.com/p/a-compass-for-the-good).

## How it works

It is a simple idea: a participant publishes a signed orientation event toward some subject and backs that orientation with real sacrifice. Chronicle nodes accept these events, batch them, anchor them to Bitcoin, and publish the batch artifacts publicly. Clients can then verify the events and compute trust and reputation from the resulting public graph.

The protocol gives us a growing vocabulary of verifiably costly digital action. A participant can orient toward a Chronicle node, a Chronicle pubkey, a specific prior Chronicle event, or external subjects such as an email address. This makes it possible to accumulate public evidence in specific contexts rather than collapsing everything into one undifferentiated reputation score. For example, one can build trust maps for Chronicle nodes, assess whether a specific email sender is spammy or trustworthy, or express second-order judgment about whether a prior orientation proved useful or misleading. Those ideas are reflected in the current registry drafts.

Like Nostr, Chronicle is open and simple at the protocol boundary. Nodes may have different policies, fees, and operational choices, but the event format, publication rules, and public batch artifacts are shared. Anyone can verify the published events, their ordering, their batch roots, and their Bitcoin anchors from public data.

## Protocol specification

See [CIP-01: Chronicle Node Protocol](./CIP-01.md) for the core node protocol: events, authentication, funding, publishing, streaming, and publication.
  

Kind specs are defined in the `registry/`. The initial set includes:

- [`chronicle:event`](./registry/kinds/chronicle/event/v1.0.0/spec.md)
- [`chronicle:node`](./registry/kinds/chronicle/node/v1.0.0/spec.md)
- [`chronicle:pubkey`](./registry/kinds/chronicle/pubkey/v1.0.0/spec.md)
- [`email:address`](./registry/kinds/email/address/v1.0.0/spec.md)
- [`email:message`](./registry/kinds/email/message/v1.0.0/spec.md)
- [`email:verify`](./registry/kinds/email/verify/v1.0.0/spec.md)
- [`web:domain`](./registry/kinds/web/domain/v1.0.0/spec.md)
- [`web:url`](./registry/kinds/web/url/v1.0.0/spec.md)
- [`web:verify`](./registry/kinds/web/verify/v1.0.0/spec.md)
- [`phone:number`](./registry/kinds/phone/number/v1.0.0/spec.md)
- [`phone:verify`](./registry/kinds/phone/verify/v1.0.0/spec.md)

## Collaboration

This is an early technical release. The protocol and registry are being developed in public and iterated quickly. Critique, scrutiny, prior art, implementation feedback, and thoughtful collaboration are welcome. Open an issue or pull request if you want to challenge an assumption, propose a refinement, or add a new kind.

## Links

- Whitepaper: [Bringing Trust and Accountability to the Web](./public/chronicle.pdf)
- Essay: [A Compass for the Good](https://cartographersguild.substack.com/p/a-compass-for-the-good)
- Website: [chronicle-network.org](https://chronicle-network.org)
