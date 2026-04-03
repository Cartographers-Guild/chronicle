# `domain_name`

## Summary

`domain_name` is a canonical lowercase ASCII domain name.

## Canonical form

A `domain_name` value MUST:

- be entirely lowercase ASCII
- consist of one or more labels separated by `.`
- contain at least one `.`
- contain only lowercase ASCII letters, digits, `-`, and `.`
- not begin or end with `.`
- not contain consecutive dots

Each label MUST:

- be non-empty
- not begin or end with `-`

## Notes

`domain_name` is a practical canonical form for Chronicle use.

It does not include scheme, port, path, query, or fragment.

It does not include a trailing dot.

## Examples

Valid:

- `example.com`
- `sub.example.com`
- `news.example-site.org`

Invalid:

- `Example.com`
- `.example.com`
- `example.com.`
- `example..com`
- `-example.com`
- `example-.com`
- `https://example.com`
- `example.com:443`