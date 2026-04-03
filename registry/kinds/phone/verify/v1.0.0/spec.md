# `phone:verify`

## Summary

`phone:verify` identifies a public backing claim for a telephone number by the signing Chronicle pubkey.

## Subject

`subject` MUST be of type [`phone_number`](../../../../types/phone_number/v1.0.0/spec.md).

## Motivation

Phone numbers are often published as contact points for people, businesses, and services. `phone:verify` makes it possible to connect a number to a specific Chronicle pubkey with public credibility at stake.

Clients may use `phone:verify` as evidence that the signing pubkey stands behind that number and is willing to stake its reputation on that claim.

## Interpretation

Multiple pubkeys may emit `phone:verify` for the same number. This kind does not resolve competing claims on its own.

Clients may interpret competing claims by weighing both the credibility of the specific `phone:verify` events and the credibility of the pubkeys that signed them.