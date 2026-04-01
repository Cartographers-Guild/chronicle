# `email_message_fingerprint`

## Summary

`email_message_fingerprint` is a canonical fingerprint of a specific email message.

## Canonical form

An `email_message_fingerprint` value MUST be the [`sha256_hex`](../../sha256_hex/v1.0.0/spec.md) digest of the compact UTF-8 JSON serialization of:

```
[from_address, to_address, message_id, subject, body_sha256]
```

where `from_address` and `to_address` are canonical [`email_address`](../../email_address/v1.0.0/spec.md) values.

## Example

For a message with:

- `from_address = "alice@example.com"`
- `to_address = "bob@example.com"`
- `message_id = "msg-123@example.com"`
- `subject = "Hello Bob"`

and body bytes corresponding to:

```
Hi Bob,
Lunch tomorrow?

Alice
```

the normalized body is:

```
Hi Bob,\nLunch tomorrow?\n\nAlice\n
```

so:

```
body_sha256 = "daff6b8671e7651c09f046cd989578ade4152f3534deb5ea81f064e0640c5a12"
```

The compact UTF-8 JSON serialization is:

```json
["alice@example.com","bob@example.com","msg-123@example.com","Hello Bob","daff6b8671e7651c09f046cd989578ade4152f3534deb5ea81f064e0640c5a12"]
```

The resulting fingerprint is:

```
473e7bf6b8b08d0d642378f4716d021933edfe88a2f2aac7b2244fc5a7015d16
```

