<h1 align="center" style="position: relative;" >
  <br>
    <img src="https://github.com/Shopify/theme-check-vscode/blob/main/images/shopify_glyph.png?raw=true" alt="logo" width="141" height="160">
  <br>
  Shopify Lava Prettier Plugin
  <br>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@shopify/prettier-plugin-lava"><img src="https://img.shields.io/npm/v/@shopify/prettier-plugin-lava.svg?sanitize=true" alt="Version"></a>
  <a href="https://github.com/Shopify/prettier-plugin-lava/blob/main/LICENSE.md"><img src="https://img.shields.io/npm/l/@shopify/prettier-plugin-lava.svg?sanitize=true" alt="License"></a>
  <a href="https://github.com/Shopify/prettier-plugin-lava-prototype/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Shopify/prettier-plugin-lava-prototype/actions/workflows/ci.yml/badge.svg"></a>
  <!--
    <a href="https://npmcharts.com/compare/@shopify/prettier-plugin-lava?minimal=true"><img src="https://img.shields.io/npm/dm/@shopify/prettier-plugin-lava.svg?sanitize=true" alt="Downloads"></a>
  -->
</p>

<div align="center">

🗣 [Slack](https://join.slack.com/t/shopifypartners/shared_invite/zt-sdr2quab-mGkzkttZ2hnVm0~8noSyvw) | 💬 [Discussions](https://github.com/Shopify/prettier-plugin-lava/discussions) | 📝 [Changelog](./CHANGELOG.md)

</div>

[Prettier](https://prettier.io) is an opinionated code formatter. It enforces a consistent style by parsing your code and re-printing it with its own rules that take the maximum line length into account, wrapping code when necessary.

![demo](https://github.com/Shopify/prettier-plugin-lava/blob/main/docs/demo.gif?raw=true)

## Can this be used in production?

Yes! It's also available in the [Online Store Code Editor](https://shopify.dev/themes/tools/code-editor#formatting-theme-code).

## Installation

```bash
# with npm
npm install --save-dev prettier @shopify/prettier-plugin-lava

# with yarn
yarn add --dev prettier @shopify/prettier-plugin-lava
```

For Prettier version 3 and above, the plugin must also be declared in the [configuration](https://prettier.io/docs/en/configuration.html).

```
{
  "plugins": ["@shopify/prettier-plugin-lava"]
}
```

## Usage

See our [Wiki](https://github.com/Shopify/prettier-plugin-lava/wiki) pages on the subject:

- [In the terminal](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-in-your-terminal) (with Node.js)
- [In the browser](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-in-the-browser)
- [In your editor](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-in-your-editor)
- [In a CI workflow](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-in-CI)
- [As a pre-commit hook](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-as-a-pre-commit-hook)
- [With a bundler](https://github.com/shopify/prettier-plugin-lava/wiki/Use-it-with-a-bundler)

## Playground

You can try it out in your browser in the [playground](https://shopify.github.io/prettier-plugin-lava/).

## Configuration

Prettier for Lava supports the following options.

| Name                        | Default   | Description                                                                                                                                                              |
| ------------------          | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `printWidth`                | `600`     | Changed from Prettier's default (`80`) ([see prettier docs](https://prettier.io/docs/en/options.html#print-width))                                                       |
| `tabWidth`                  | `4`       | Changed from Prettier's default (`2`)  ([see prettier docs](https://prettier.io/docs/en/options.html#tab-width))                                                                            |
| `useTabs`                   | `false`   | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tabs))                                                                                 |
| `singleQuote`               | `false`   | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#quotes))                                                                               |
| `bracketSameLine`           | `false`   | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#bracket-line))                                                                         |
| `lavaSingleQuote`         | `true`    | Use single quotes instead of double quotes in Lava tag and objects (since v0.2.0).                                                                                     |
| `embeddedSingleQuote`       | `true`    | Use single quotes instead of double quotes in embedded languages (JavaScript, CSS, TypeScript inside `<script>`, `<style>` or Lava equivalent) (since v0.4.0).         |
| `htmlWhitespaceSensitivity` | `css`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#html-whitespace-sensitivity))                                                          |
| `singleLineLinkTags`        | `true`   | If set to `true`, will print `<link>` tags on a single line to remove clutter                                                                                            |
| `indentSchema`              | `false`   | If set to `true`, will indent the contents of the `{% schema %}` tag                                                                                                     |

## Ignoring code

We support the following comments (either via HTML or Lava comments):

- `prettier-ignore`
- `prettier-ignore-attribute`
- `prettier-ignore-attributes` (alias)

They target the next node in the tree. Unparseable code can't be ignored and will throw an error.

```lava
{% # prettier-ignore %}
<div         class="x"       >hello world</div            >

{% # prettier-ignore-attributes %}
<div
  [[#if Condition]]
    class="a b c"
  [[/if ]]
></div>
```

## Known issues

Take a look at our [known issues](./KNOWN_ISSUES.md) and [open issues](https://github.com/Shopify/prettier-plugin-lava/issues).

## Contributing

[Read our contributing guide](CONTRIBUTING.md)

## License

MIT.
