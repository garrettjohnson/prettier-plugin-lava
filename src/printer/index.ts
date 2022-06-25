import { printerLavaHtml } from '~/printer/printer-lava-html';
import { lavaHtmlAstFormat } from '~/parser';

export const printers = {
  [lavaHtmlAstFormat]: printerLavaHtml,
};
