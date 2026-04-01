# `chronicle:pubkey`

## Summary

`chronicle:pubkey` identifies an actor within the Chronicle network by its public key. 


## Subject

`subject` MUST be of type [`schnorr_pubkey`](../../../../types/schnorr_pubkey/v1.0.0/spec.md).

## Motivation


This kind attaches orientation to a Chronicle actor more broadly than `chronicle:event`, which refers to 
one specific prior action.

Clients may use such orientations, together with orientations toward `chronicle:event`, to derive richer
trust and reputation maps.

`chronicle:pubkey` is therefore useful when the intended judgment is about the Chronicle subject in general
within the Chronicle context, rather than about one specific event.