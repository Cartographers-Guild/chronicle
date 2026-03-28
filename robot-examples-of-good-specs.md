A few that are frequently cited as models of clarity:

**RFC 7231** — HTTP/1.1 Semantics and Content. Probably the gold standard for a protocol spec. It separates method definitions, header field definitions, and status codes into clean independent sections, each with a consistent structure: definition, syntax, processing rules, examples. You can read any section in isolation and get a complete picture.

**RFC 7519** — JSON Web Tokens (JWT). Short, tight, well-organised. Defines the data model first, then the serialisation, then the validation algorithm as a numbered sequence of steps. The numbered-steps approach for algorithms is something the Chronicle spec notably lacks — "validate the event" is described in prose rather than as an unambiguous ordered procedure.

**RFC 8446** — TLS 1.3. Much longer and more complex, but exemplary at separating normative requirements (MUST/SHOULD/MAY) from explanatory text. It uses the RFC 2119 keywords consistently and precisely throughout, so implementers can mechanically extract every hard requirement.

**RFC 7517** — JSON Web Key (JWK). A good example of how to handle a registry cleanly — it defines the base structure, then defines extension points, then separates the initial registry into an appendix with a clear registration process for new values. Compare this to Chronicle's kind registry, which is defined in an appendix with no extension mechanism or registration process described.

**RFC 4880** — OpenPGP. Relevant to Chronicle specifically because it handles similar concepts — public keys, signatures, canonical data formats. Its approach to defining wire formats with explicit field widths, types, and parsing rules is very precise.

A few structural patterns these share that Chronicle would benefit from:

The consistent use of RFC 2119 language (`MUST`, `SHOULD`, `MAY`) is there in Chronicle but not always applied consistently — some requirements are stated as plain assertions rather than normative keywords. The good RFCs are almost mechanical about this.

They all define an ABNF or similar formal grammar for any syntax that needs to be parsed, rather than describing it in prose. Chronicle's canonical forms for subjects (URLs, email addresses, domains) would benefit from this enormously — it would close the normalisation ambiguity gaps we discussed earlier.

They separate the "what" from the "how" very cleanly — data structures in one place, algorithms in another, error handling in another. Chronicle mixes these together within each endpoint section.
