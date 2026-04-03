# `websocket_url`

## Summary

`websocket_url` is a canonical absolute WebSocket URL.

## Canonical form

A `websocket_url` value MUST satisfy the canonical form of [`absolute_url`](../../absolute_url/v1.0.0/spec.md), except that:

- the scheme MUST be `ws` or `wss`
- the default port MUST be omitted:
  - `:80` for `ws`
  - `:443` for `wss`

## Notes

`websocket_url` is a practical canonical form for Chronicle use.

## Examples

Valid:

- `wss://relay.example.com/`
- `wss://relay.example.com/nostr`
- `ws://relay.example.com:8080/`

Invalid:

- `WSS://relay.example.com/`
- `wss://Relay.example.com/`
- `wss://user@relay.example.com/`
- `wss://relay.example.com`
- `wss://relay.example.com:443/`
- `https://relay.example.com/`
- `wss://relay.example.com/#general`
- `ws://localhost:8080/`