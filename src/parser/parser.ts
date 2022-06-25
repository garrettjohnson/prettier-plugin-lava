import { Parser, ParserOptions } from 'prettier';
import { locEnd, locStart } from '~/utils';
import { toLavaHtmlAST, LavaHtmlNode } from '~/parser/ast';

function parse(
  text: string,
  _parsers: Parsers,
  _opts: ParserOptions<LavaHtmlNode>,
): LavaHtmlNode {
  return toLavaHtmlAST(text);
}

export const lavaHtmlAstFormat = 'lava-html-ast';

export const lavaHtmlLanguageName = 'lava-html';

export const lavaHtmlParser: Parser<LavaHtmlNode> = {
  parse,
  astFormat: lavaHtmlAstFormat,
  locStart,
  locEnd,
};

export interface Parsers {
  [languageName: string]: Parser;
}
