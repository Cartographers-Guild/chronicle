# `phone:number`

## Summary

`phone:number` identifies a telephone number.

## Subject

`subject` MUST be of type [`phone_number`](../../../../types/phone_number/v1.0.0/spec.md).

## Motivation

Phone spam and scam calls are a familiar problem. `phone:number` makes it possible to judge whether a given number has been useful, trustworthy, spammy, abusive, or otherwise worth answering, blocking, or ranking differently.

This gives clients a way to rank and interpret phone numbers by public credibility, for example by suppressing likely spam and surfacing more trusted callers or senders.