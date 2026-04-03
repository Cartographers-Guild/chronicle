# `email:address`

## Summary

`email:address` identifies an email mailbox address.

## Subject

`subject` MUST be of type [`email_address`](../../../../types/email_address/v1.0.0/spec.md).

## Motivation

Email inboxes are a canonical spam problem. `email:address` makes it possible to judge whether a given address has been useful, trustworthy, spammy, misleading, or abusive.

Clients may orient negatively toward spammy or abusive addresses, and positively toward addresses that have proven useful or that have been publicly backed by credible senders.

This gives clients a way to rank senders by public credibility, for example by suppressing likely spam and surfacing more trusted mail higher in the inbox.