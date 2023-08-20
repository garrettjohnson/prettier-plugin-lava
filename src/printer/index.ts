import {
  printerLavaHtml2,
  printerLavaHtml3,
} from '~/printer/printer-lava-html';
import { lavaHtmlAstFormat } from '~/parser';

export const printers2 = {
  [lavaHtmlAstFormat]: printerLavaHtml2,
};

export const printers3 = {
  [lavaHtmlAstFormat]: printerLavaHtml3,
};
