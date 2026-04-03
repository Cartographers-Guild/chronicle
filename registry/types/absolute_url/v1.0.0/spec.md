# `absolute_url`

## Summary

`absolute_url` is a canonical absolute web URL.

## Canonical form

An `absolute_url` value MUST:

- use the `http` or `https` scheme
- be entirely ASCII
- include a host of type [`domain_name`](../../domain_name/v1.0.0/spec.md)
- not contain userinfo
- not contain a fragment
- not contain surrounding whitespace

The scheme and host MUST be lowercase.

If a port is present, it MUST be decimal digits only.

The default port MUST be omitted:

- `:80` for `http`
- `:443` for `https`

If the path is empty, it MUST be `/`.

## Notes

`absolute_url` is a practical canonical form for Chronicle use.

This type does not attempt to represent every valid URI or URL form.

## Examples

Valid:

- `https://example.com/`
- `https://example.com/article`
- `https://sub.example.com/path?q=test`
- `http://example.com:8080/`

Invalid:

- `HTTPS://example.com/`
- `https://Example.com/`
- `https://user@example.com/`
- `https://example.com`
- `https://example.com:443/`
- `https://example.com/article#section-2`
- `ftp://example.com/file`
- ` https://example.com/ `