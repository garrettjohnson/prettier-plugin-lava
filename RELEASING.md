## Releasing `@shopify/prettier-plugin-liquid`

1. Check the Semantic Versioning page for info on how to version the new release: http://semver.org

2. Run the following command to update the version in `package.json` and replace the `VERSION` placeholder in the documentation for new configuration variables:

   ```bash
   VERSION="X.X.X"
   yarn prerelease
   ```

3. Run [`git changelog`](https://github.com/tj/git-extras) to update `CHANGELOG.md`.

4. Commit your changes and make a PR.

   ```bash
   git checkout -b "bump/v$VERSION"
   git add CHANGELOG.md package.json src/index.ts
   git commit -m "Bump version to $VERSION"
   hub compare "main:bump/v$VERSION"
   ```

5. Merge your PR to main.

6. On [Shipit](https://shipit.shopify.io/shopify/prettier-plugin-liquid), deploy your commit.

7. [Create a GitHub release](https://github.com/Shopify/prettier-plugin-liquid/releases/new) for the change.

   ```
   git fetch origin
   git fetch origin --tags
   git reset origin v$VERSION
   gh release create -t v$VERSION
   ```

   (It's a good idea to copy parts of the CHANGELOG in there)