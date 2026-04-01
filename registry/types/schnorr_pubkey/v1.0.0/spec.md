# `schnorr_pubkey`

## Summary

`schnorr_pubkey` is an x-only secp256k1 public key encoded as exactly 64 lowercase hexadecimal characters.

It is the canonical value type used wherever a BIP340-style x-only public key is required.

## Canonical form

A `schnorr_pubkey` value MUST:

- satisfy the canonical form of [`sha256_hex`](../../sha256_hex/v1.0.0/spec.md)
- represent a valid x-only secp256k1 public key

## Notes

`schnorr_pubkey` has the same lexical form as `sha256_hex`, but adds the requirement that the value be a valid x-only secp256k1 public key.
