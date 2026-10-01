# Contributing

Ideas, bug reports and pull requests are welcome in the
[issues](https://github.com/johnmorrisdotca/tsunagi/issues).

## Working on it

```sh
pnpm install
pnpm check          # lint, types and tests
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
```

A change to the rules is tested beside it, and must leave every level in
`src/levels/` with exactly one answer, the one stored: people's solves, times
and half-drawn boards on itsutsu.com are on each of them, kept by its number.
A level once published keeps its number; see `scripts/tsunagi-levels.ts`.

## Releasing

A version tag (`v1.2.3`, the same as `package.json`'s version) runs
`.github/workflows/release.yml`: it checks and builds the package, attaches the
tarball to a GitHub release, and publishes it to npm by trusted publishing,
with no token. Write the release in `CHANGELOG.md` first.
