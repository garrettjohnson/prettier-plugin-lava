<h1 align="center" style="position: relative;" >
  <br>
    <img src="https://github.com/garrettjohnson/prettier-plugin-lava/blob/main/docs/images/GitHubBanner.jpg?raw=true" alt="logo">
  <br>
  Rock RMS Lava Prettier Plugin
  <br>
</h1>

<p align="center">
  <!-- <a href="https://www.npmjs.com/package/@garrettjohnson/prettier-plugin-lava"><img src="https://img.shields.io/npm/v/@garrettjohnson/prettier-plugin-lava.svg?sanitize=true" alt="Version"></a>
  <a href="https://github.com/garrettjohnson/prettier-plugin-lava/blob/main/LICENSE.md"><img src="https://img.shields.io/npm/l/@garrettjohnson/prettier-plugin-lava.svg?sanitize=true" alt="License"></a>
  <a href="https://github.com/garrettjohnson/prettier-plugin-lava-prototype/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/garrettjohnson/prettier-plugin-lava-prototype/actions/workflows/ci.yml/badge.svg"></a> -->
  <!--
    <a href="https://npmcharts.com/compare/@garrettjohnson/prettier-plugin-lava?minimal=true"><img src="https://img.shields.io/npm/dm/@garrettjohnson/prettier-plugin-lava.svg?sanitize=true" alt="Downloads"></a>
  -->
</p>

This is a very early (NOT PRODUCTION READY) and experimental fork of the Shopify Prettier Plugin for Liquid, with enhancements for Rock RMS Lava, including entity commands, and Rock RMS specific changes to the underlying liquid syntax. 

===

Prettier is an opinionated code formatter. It enforces a consistent style by parsing your code and re-printing it with its own rules that take the maximum line length into account, wrapping code when necessary.

**This is the developer preview** of the Lava/HTML prettier plugin.

![demo](https://github.com/garrettjohnson/prettier-plugin-lava/blob/main/docs/demo.gif?raw=true)

## Can this be used in production?

_Not yet_. We have a [list of issues](https://github.com/garrettjohnson/prettier-plugin-lava/issues) we're going through before it is considered stable.

## Installation

```bash
# with npm
npm install --save-dev prettier @garrettjohnson/prettier-plugin-lava

# with yarn
yarn add --dev prettier @garrettjohnson/prettier-plugin-lava
```

## Usage

See our [Wiki](https://github.com/garrettjohnson/prettier-plugin-lava/wiki) pages on the subject:

- [In the terminal](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-in-your-terminal) (with Node.js)
- [In the browser](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-in-the-browser)
- [In your editor](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-in-your-editor)
- [In a CI workflow](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-in-CI)
- [As a pre-commit hook](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-as-a-pre-commit-hook)
- [With a bundler](https://github.com/garrettjohnson/prettier-plugin-lava/wiki/Use-it-with-a-bundler)

## Configuration

Prettier for Lava supports the following options.

| Name                        | Default   | Description                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------          | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `printWidth`                | `0`     | Changed from Prettier's default (`80`) ([see prettier docs](https://prettier.io/docs/en/options.html#print-width))                                                                                                                                                                                                                                                                    |
| `tabWidth`                  | `2`       | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tab-width))                                                                                                                                                                                                                                                                                         |
| `useTabs`                   | `false`   | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tabs))                                                                                                                                                                                                                                                                                              |
| `singleQuote`               | `false`   | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#quotes))                                                                                                                                                                                                                                                                                            |
| `htmlWhitespaceSensitivity` | `css`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#html-whitespace-sensitivity))                                                                                                                                                                                                                                                                       |
| `singleLineLinkTags`        | `false`   | If set to `true`, will print `<link>` tags on a single line to remove clutter                                                                                                                                                                                                                                                                                                         |
| `indentSchema`              | `false`   | If set to `true`, will indent the contents of the `{% schema %}` tag                                                                                                                                                                                                                                                                                                                  |

## Known issues

Take a look at our [known issues](./KNOWN_ISSUES.md) and [open issues](https://github.com/garrettjohnson/prettier-plugin-lava/issues).

## Contributing

[Read our contributing guide](CONTRIBUTING.md)

## License

MIT.
