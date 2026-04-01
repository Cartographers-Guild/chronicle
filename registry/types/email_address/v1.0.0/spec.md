# `email_address`

## Summary

`email_address` is a canonical email mailbox address encoded as a single lowercase ASCII string of the form:

```
local-part@domain
```

## Canonical form

An `email_address` value MUST:

* contain exactly one `@`
* be entirely lowercase ASCII
* contain a non-empty local part
* contain a non-empty domain part
* contain no surrounding whitespace

The local part MUST:

* contain only lowercase ASCII letters, digits, and these characters:

```
.!#$%&'*+/=?^_`{|}~-
```

* not begin or end with `.`
* not contain consecutive dots

The domain part MUST:

* consist of lowercase ASCII labels separated by `.`
* contain only lowercase ASCII letters, digits, `-`, and `.`
* not begin or end with `.`
* not contain consecutive dots
* have labels that are non-empty
* have labels that do not begin or end with `-`

## Notes

`email_address` is a practical canonical mailbox form for Chronicle use. It does not attempt to represent every mailbox syntax accepted by email standards or specific providers.

This type does not define provider-specific alias normalization. In particular, it does not remove `+tags`, collapse dots, or apply provider-specific mailbox equivalence rules.

## Examples

Valid:

* `alice@example.com`
* `alice+news@example.com`
* `ops@sub.example.org`
* `a_b.c-d@example-mail.org`

Invalid:

* `Alice@example.com`
* `alice@example.com `
* `alice..bob@example.com`
* `.alice@example.com`
* `alice.@example.com`
* `alice@example..com`
* `alice@-example.com`
* `Alice <alice@example.com>`
* `mailto:alice@example.com`
* `alice@@example.com`