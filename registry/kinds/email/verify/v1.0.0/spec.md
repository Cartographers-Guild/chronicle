# `email:verify`

## Summary

`email:verify` identifies a public backing claim for an email address by the signing Chronicle pubkey.

## Subject

`subject` MUST be of type [`email_address`](../../../../types/email_address/v1.0.0/spec.md).

## Motivation

This kind lets a Chronicle pubkey publicly claim and back an email address.

Clients may use `email:verify` as evidence that the signing pubkey stands behind that address and is willing to stake its own Chronicle reputation on that claim.

## Interpretation

Multiple pubkeys may emit `email:verify` for the same address. This kind does not resolve competing claims on its own.

Clients may interpret competing claims by weighing the credibility of the specific `email:verify` events and of the pubkeys that signed them. In simple cases, a low-trust or unknown pubkey making a competing claim may carry little weight. In harder cases, a competing claim by a credible pubkey may need to be judged in the broader public context.

Because Chronicle orientation is public, disputed claims can themselves be opposed. A client may treat negative orientation toward a specific `email:verify` event as evidence against that claim, and negative orientation toward the claiming `chronicle:pubkey` as broader evidence against the claimant.

This lets address disputes remain open to public contest rather than being fixed by first-claim or by a single authority.