# `nostr:pubkey`

## Summary

`nostr:pubkey` identifies a Nostr account by its public key.

## Subject

`subject` MUST be of type [`schnorr_pubkey`](../../../../types/schnorr_pubkey/v1.0.0/spec.md).

## Motivation

Nostr pubkeys are long-lived public identities. `nostr:pubkey` makes it possible to judge a pubkey more broadly than any one specific event.

Clients may use it to distinguish accounts that appear trustworthy, useful, misleading, abusive, or consistently valuable in the Nostr context.