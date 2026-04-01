# `email:message`

## Summary

`email:message` identifies a specific email message by its canonical message fingerprint.

## Subject

`subject` MUST be of type [`email_message_fingerprint`](../../../../types/email_message_fingerprint/v1.0.0/spec.md).

## Motivation

This kind lets a Chronicle pubkey publicly back one specific email message, not only an email address in general.

It is useful for message-level filtering and ranking, where the receiver wants to know whether this exact message was backed by a pubkey with public credibility at stake.

## Embedded proof

To make the backing discoverable by receivers, a sender SHOULD include:

- `X-Chronicle-Event: <event-id>`

`X-Chronicle-Event` is the Chronicle event id of the backing `email:message` event.

A receiver can resolve that event, recompute the `email_message_fingerprint` from the received message, and verify that the resolved Chronicle event has:

- `kind = "email:message"`
- `subject = <recomputed email_message_fingerprint>`

## Address binding

`email:message` proves that a Chronicle pubkey backed a specific email message fingerprint.

By itself, it does not prove that the signing pubkey controls the sender address. Clients may treat it as stronger when the same pubkey has also emitted [`email:verify`](../../verify/v1.0.0/spec.md) for the sender address.
