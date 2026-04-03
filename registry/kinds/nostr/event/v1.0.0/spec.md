# `nostr:event`

## Summary

`nostr:event` identifies a specific Nostr event by its event id.

## Subject

`subject` MUST be of type [`sha256_hex`](../../../../types/sha256_hex/v1.0.0/spec.md).

## Motivation

A Nostr account may be judged broadly, but individual posts and replies often deserve judgment of their own. `nostr:event` makes it possible to orient toward one specific Nostr event rather than only toward its author.

Clients may use it to judge whether a particular note, reply, repost, or other event was useful, misleading, harmful, or otherwise worth orienting toward.