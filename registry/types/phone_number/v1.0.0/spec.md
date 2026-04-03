# `phone_number`

## Summary

`phone_number` is a canonical telephone number in `+`-prefixed digits-only form.

## Canonical form

A `phone_number` value MUST:

- begin with `+`
- contain only decimal digits after `+`
- contain at least one digit after `+`
- contain no spaces, dashes, parentheses, dots, or other separators
- contain at least 3 digits after `+`

## Notes

`phone_number` is a practical canonical form for Chronicle use.

It does not encode formatting, locale, extension numbers, or provider-specific dialing rules.

## Examples

Valid:

- `+12025550123`
- `+447700900123`

Invalid:

- `12025550123`
- `+1 202 555 0123`
- `+1-202-555-0123`
- `(+1)2025550123`
- `tel:+12025550123`
- `+1`