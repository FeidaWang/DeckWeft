# Release checklist: build first, publish deliberately

[Home](../../README.md) · [Compatibility](compatibility.md)

This repository is prepared for publication; creating these files does not publish it.

1. Review the proposed DeckWeft name, upstream notices, and public asset rights. Keep LICENSE and NOTICE. Remove private files and inspect the staged diff.
2. Run `npm run verify`. Read the generated outputs. Run actual authenticated host loading, target-app rendering and the configured GitHub CI before claiming those surfaces supported.
3. Update every version manifest together. Record actual test environments and accepted limitations. Use honest alpha wording and real screenshots, not fake badges or stars.
4. Choose the real repository owner and visibility. No remote owner, homepage, issue URL or security email has been fabricated in this source. Add real metadata only after the repository exists.
5. Publish the source only with your own explicit Git/GitHub action. Add the generated plugin ZIP to a release when ready. Source market manifests reference `dist/deckweft-plugin`; that path must be present in the chosen published distribution or consumers must build it locally first.
6. Enable private vulnerability reporting and set a maintainer policy. Check generated ZIP paths and SHA-256 checksums before sharing.

`private: true` in package.json prevents accidental npm publication. Do not remove it until registry naming, credentials, package contents, support ownership and release automation are separately reviewed. A normal source ZIP or GitHub repository remains usable.

GitHub's CI workflow creates artifacts on push/pull request but does not create a public release, push tags, publish npm packages, or grant host permissions.

The workflow uses the currently documented major releases of [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), and [upload-artifact](https://github.com/actions/upload-artifact). It requests read-only repository permission, disables persistent checkout credentials, and disables automatic package caching because the runtime has no third-party dependencies. Validate these moving major tags in your real repository before release; this local build did not execute GitHub Actions.


[Alpha.2 scope and upgrade notes](alpha-2.md). Real-host gate remains blocked until actual authenticated execution and manual inspection. Run browser tests in direct mode before claiming browser/CSP compatibility.
