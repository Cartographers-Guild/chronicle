# `chronicle:node`

## Summary

`chronicle:node` identifies a Chronicle node by its public key.

## Subject

`subject` MUST be of type [`schnorr_pubkey`](../../../../types/schnorr_pubkey/v1.0.0/spec.md).

In Chronicle, this is the same node public key advertised by the node in `GET /info` in `CIP-01`.

## Motivation

Chronicle clients connect to nodes, fund accounts with them, and rely on them to accept, relay, and publish events honestly. `chronicle:node` makes node behavior itself a public subject of judgment.

From prior orientations toward a node, clients can distinguish nodes that appear trustworthy and reliable, nodes that appear unsafe or dishonest, and nodes for which little or no public information yet exists.