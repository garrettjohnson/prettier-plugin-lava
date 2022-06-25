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
  singleLineLinkTags: {
    type: 'boolean',
    category: 'HTML',
    default: true,
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
  printWidth: 600,
  tabWidth: 4,
};

const plugin: Plugin<LavaHtmlNode> = {
  languages,
  parsers,
  printers,
  options,
  defaultOptions,
};

export = plugin;
