# `sha256_hex`

## Summary

`sha256_hex` is a 32-byte value encoded as exactly 64 lowercase hexadecimal characters.

It is a reusable canonical value type for SHA-256 digests and other 32-byte identifiers that use the same lexical form.

## Canonical form

A `sha256_hex` value MUST:

- be exactly 64 characters long
- use only lowercase hexadecimal characters: `0-9` and `a-f`
