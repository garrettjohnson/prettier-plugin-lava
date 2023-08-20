import { locEnd, locStart } from '~/utils';
import { toLavaHtmlAST, LavaHtmlNode } from '~/parser/stage-2-ast';

export function parse(text: string): LavaHtmlNode {
  return toLavaHtmlAST(text);
}

export const lavaHtmlAstFormat = 'lava-html-ast';

export const lavaHtmlLanguageName = 'lava-html';

export const lavaHtmlParser = {
  parse,
  astFormat: lavaHtmlAstFormat,
  locStart,
  locEnd,
};
