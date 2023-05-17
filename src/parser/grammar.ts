import ohm from 'ohm-js';

export const lavaHtmlGrammars = ohm.grammars(
  require('../../grammar/lava-html.ohm.js'),
);

export const lavaGrammar = lavaHtmlGrammars['Lava'];
export const lavaHtmlGrammar = lavaHtmlGrammars['LavaHTML'];
export const lavaStatementsGrammar = lavaHtmlGrammars['LavaStatement'];

// see ../../grammar/lava-html.ohm for full list
export const BLOCKS = (
  lavaHtmlGrammar.rules as any
).blockName.body.factors[0].terms.map((x: any) => x.obj) as string[];

// see ../../grammar/lava-html.ohm for full list
export const VOID_ELEMENTS = (
  lavaHtmlGrammar.rules as any
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
