import {
  Plugin,
  RequiredOptions,
  SupportLanguage,
  SupportOptions,
} from 'prettier';
import { parsers, lavaHtmlLanguageName } from '~/parser';
import { printers } from '~/printer';
import { LavaHtmlNode } from '~/types';

const languages: SupportLanguage[] = [
  {
    name: 'LavaHTML',
    parsers: [lavaHtmlLanguageName],
    extensions: ['.lava'],
    vscodeLanguageIds: ['lava', 'Lava'],
  },
];

const options: SupportOptions = {
  lavaSingleQuote: {
    type: 'boolean',
    category: 'LAVA',
    default: true,
    description:
      'Use single quotes instead of double quotes in Lava tags and objects.',
    since: '0.2.0',
  },
  embeddedSingleQuote: {
    type: 'boolean',
    category: 'LAVA',
    default: true,
    description:
      'Use single quotes instead of double quotes in embedded languages (JavaScript, CSS, TypeScript inside <script>, <style> or Lava equivalent).',
    since: '0.4.0',
  },
  singleLineLinkTags: {
    type: 'boolean',
    category: 'HTML',
    default: false,
    description: 'Always print link tags on a single line to remove clutter',
    since: '0.1.0',
  },
  indentSchema: {
    type: 'boolean',
    category: 'LAVA',
    default: false,
    description: 'Indent the contents of the {% schema %} tag',
    since: '0.1.0',
  },
};

const defaultOptions: Partial<RequiredOptions> = {
  printWidth: 120,
};

const plugin: Plugin<LavaHtmlNode> = {
  languages,
  parsers,
  printers,
  options,
  defaultOptions,
};

export = plugin;
