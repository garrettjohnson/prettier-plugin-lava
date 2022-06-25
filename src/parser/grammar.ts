import ohm from 'ohm-js';

export const lavaHtmlGrammar = ohm.grammar(
  require('../../grammar/lava-html.ohm.js'),
);

// see ../../grammar/lava-html.ohm for full list
export const BLOCKS = (lavaHtmlGrammar.rules as any).blockName.body.terms.map(
  (x: any) => x.obj,
) as string[];

// see ../../grammar/lava-html.ohm for full list
export const VOID_ELEMENTS = (
  lavaHtmlGrammar.rules as any
).voidElementName.body.terms.map((x: any) => x.args[0].obj) as string[];
