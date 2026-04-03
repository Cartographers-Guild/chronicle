# `web:verify`

## Summary

`web:verify` identifies a public backing claim for a web domain by the signing Chronicle pubkey.

## Subject

`subject` MUST be of type [`domain_name`](../../../../types/domain_name/v1.0.0/spec.md).

## Motivation

A domain is one of the main public identity surfaces on the web. `web:verify` lets clients connect that domain to a specific Chronicle pubkey with public credibility at stake.

Clients may use `web:verify` as evidence that the signing pubkey stands behind that domain and is willing to stake its reputation on that claim.

## Proof of control

To strengthen a `web:verify` claim, the domain owner SHOULD serve the same pubkey at:

```
https://<domain>/.well-known/chronicle-pubkey
```

The response body SHOULD be a canonical [`schnorr_pubkey`](../../../../types/schnorr_pubkey/v1.0.0/spec.md), optionally followed by a trailing newline.

If the pubkey served at that path matches the pubkey that signed the `web:verify` event, clients may treat that as evidence that the domain is controlled by that pubkey.

If the domain does not serve that path, or serves a different pubkey, the `web:verify` event remains a public backing claim but without this additional proof of control.

## Interpretation

Multiple pubkeys may emit `web:verify` for the same domain. This kind does not resolve competing claims on its own.

A matching `/.well-known/chronicle-pubkey` response is stronger evidence than an unmatched competing claim. When no matching proof of control is present, clients may weigh competing claims by the credibility of the specific `web:verify` events and of the pubkeys that signed them.

