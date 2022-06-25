import {
  Parsers,
  lavaHtmlParser,
  lavaHtmlAstFormat,
  lavaHtmlLanguageName,
} from '~/parser/parser';

export * from '~/parser/ast';

export { lavaHtmlLanguageName, lavaHtmlAstFormat };

export const parsers: Parsers = {
  [lavaHtmlLanguageName]: lavaHtmlParser,
};
