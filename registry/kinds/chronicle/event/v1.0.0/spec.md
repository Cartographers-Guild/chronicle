# `chronicle:event`

## Summary

`chronicle:event` identifies a Chronicle orientation event by its event id.

## Subject

`subject` MUST be of type [`sha256_hex`](../../../../types/sha256_hex/v1.0.0/spec.md).

In Chronicle, this is the event id defined by `CIP-01` for the unsigned event payload.


## Motivation

This kind makes second-order orientation possible by attaching orientation to a specific prior Chronicle event.
One event may refer to another event as useful, misleading, harmful, or otherwise worth orienting toward.

This narrows evaluation to a specific prior action of a Chronicle subject rather than to the subject wholesale. 
Instead of judging a `chronicle:pubkey` only in aggregate, clients can distinguish between individual orientations 
and treat some as good, bad, helpful, or unhelpful in their own right.

This gives clients a more detailed public record from which to derive trust and reputation. A subject’s broader 
reputation may be informed in part by how useful or harmful its prior orientations have proven to be in the network.

This kind therefore allows clients to reward or penalize specific acts of public orientation without collapsing all 
judgment into a single undifferentiated subject score.
