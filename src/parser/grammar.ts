import ohm from 'ohm-js';

export const lavaHtmlGrammars = ohm.grammars(
  require('../../grammar/lava-html.ohm.js'),
);

export interface LavaGrammars {
  Lava: ohm.Grammar;
  LavaHTML: ohm.Grammar;
  LavaStatement: ohm.Grammar;
}

export const strictGrammars: LavaGrammars = {
  Lava: lavaHtmlGrammars['StrictLava'],
  LavaHTML: lavaHtmlGrammars['StrictLavaHTML'],
  LavaStatement: lavaHtmlGrammars['StrictLavaStatement'],
};

export const tolerantGrammars: LavaGrammars = {
  Lava: lavaHtmlGrammars['Lava'],
  LavaHTML: lavaHtmlGrammars['LavaHTML'],
  LavaStatement: lavaHtmlGrammars['LavaStatement'],
};

export const placeholderGrammars: LavaGrammars = {
  Lava: lavaHtmlGrammars['WithPlaceholderLava'],
  LavaHTML: lavaHtmlGrammars['WithPlaceholderLavaHTML'],
  LavaStatement: lavaHtmlGrammars['WithPlaceholderLavaStatement'],
};

// see ../../grammar/lava-html.ohm for full list
export const BLOCKS = (
  strictGrammars.LavaHTML.rules as any
).blockName.body.factors[0].terms.map((x: any) => x.obj) as string[];

// see ../../grammar/lava-html.ohm for full list
export const RAW_TAGS = (
  strictGrammars.LavaHTML.rules as any
).lavaRawTag.body.terms
  .map((term: any) => term.args[0].obj)
  .concat('comment') as string[];

// see ../../grammar/lava-html.ohm for full list
export const VOID_ELEMENTS = (
  strictGrammars.LavaHTML.rules as any
).voidElementName.body.factors[0].terms.map(
  (x: any) => x.args[0].obj,
) as string[];

export const TAGS_WITHOUT_MARKUP = [
  'style',
  'schema',
  'javascript',
  'else',
  'break',
  'continue',
  'comment',
  'raw',
];
