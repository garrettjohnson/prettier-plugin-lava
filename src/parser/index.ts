import {
  lavaHtmlParser,
  lavaHtmlAstFormat,
  lavaHtmlLanguageName,
} from '~/parser/parser';

export * from '~/parser/stage-2-ast';

export { lavaHtmlLanguageName, lavaHtmlAstFormat };

export const parsers = {
  [lavaHtmlLanguageName]: lavaHtmlParser,
};
