# `nostr:relay`

## Summary

`nostr:relay` identifies a Nostr relay by its canonical WebSocket URL.

## Subject

`subject` MUST be of type [`websocket_url`](../../../../types/websocket_url/v1.0.0/spec.md).

## Motivation

Nostr clients depend on relays to publish, receive, and store events. `nostr:relay` makes it possible to judge whether a relay appears reliable, censoring, abusive, low-quality, or especially useful.