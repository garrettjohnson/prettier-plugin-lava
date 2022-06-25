import {
  HtmlSelfClosingElement,
  LavaHtmlNode,
  LavaParserOptions,
  NodeTypes,
  TextNode,
  LavaNode,
  LavaNodeTypes,
  HtmlNodeTypes,
  HtmlNode,
  HtmlVoidElement,
  HtmlComment,
  HtmlElement,
  LavaTag,
} from '~/types';
import { isEmpty } from '~/printer/utils/array';

export function isScriptLikeTag(node: { type: NodeTypes }) {
  return node.type === NodeTypes.HtmlRawNode;
}

export function isPreLikeNode(node: { cssWhitespace: string }) {
  return node.cssWhitespace.startsWith('pre');
}

// A bit like self-closing except we distinguish between them.
// Comments are also considered self-closing.
export function hasNoCloseMarker(
  node: LavaHtmlNode,
): node is HtmlComment | HtmlVoidElement | HtmlSelfClosingElement {
  return isSelfClosing(node) || isVoidElement(node) || isHtmlComment(node);
}

export function isHtmlComment(node: LavaHtmlNode): node is HtmlComment {
  return node.type === NodeTypes.HtmlComment;
}

export function isSelfClosing(
  node: LavaHtmlNode,
): node is HtmlSelfClosingElement {
  return node.type === NodeTypes.HtmlSelfClosingElement;
}

export function isVoidElement(node: LavaHtmlNode): node is HtmlVoidElement {
  return node.type === NodeTypes.HtmlVoidElement;
}

export function isHtmlElement(node: LavaHtmlNode): node is HtmlElement {
  return node.type === NodeTypes.HtmlElement;
}

export function isTextLikeNode(
  node: LavaHtmlNode | undefined,
): node is TextNode {
  return !!node && node.type === NodeTypes.TextNode;
}

export function isLavaNode(
  node: LavaHtmlNode | undefined,
): node is LavaNode {
  return !!node && LavaNodeTypes.includes(node.type as any);
}

export function isMultilineLavaTag(
  node: LavaHtmlNode | undefined,
): node is LavaTag {
  return (
    !!node &&
    node.type === NodeTypes.LavaTag &&
    !!node.children &&
    !isEmpty(node.children)
  );
}

export function isHtmlNode(node: LavaHtmlNode | undefined): node is HtmlNode {
  return !!node && HtmlNodeTypes.includes(node.type as any);
}

export function hasNonTextChild(node: LavaHtmlNode) {
  return (
    (node as any).children &&
    (node as any).children.some(
      (child: LavaHtmlNode) => child.type !== NodeTypes.TextNode,
    )
  );
}

export function shouldPreserveContent(
  node: LavaHtmlNode,
  _options: LavaParserOptions,
) {
  // // unterminated node in ie conditional comment
  // // e.g. <!--[if lt IE 9]><html><![endif]-->
  // if (
  //   node.type === "ieConditionalComment" &&
  //   node.lastChild &&
  //   !node.lastChild.isSelfClosing &&
  //   !node.lastChild.endSourceSpan
  // ) {
  //   return true;
  // }

  // // incomplete html in ie conditional comment
  // // e.g. <!--[if lt IE 9]></div><![endif]-->
  // if (node.type === "ieConditionalComment" && !node.complete) {
  //   return true;
  // }

  // TODO: handle non-text children in <pre>
  if (
    isPreLikeNode(node) &&
    (node as any).children &&
    (node as any).children.some((child: any) => !isTextLikeNode(child))
  ) {
    return true;
  }

  return false;
}

export function isPrettierIgnoreNode(node: LavaHtmlNode | undefined) {
  return (
    node &&
    node.type === NodeTypes.HtmlComment &&
    /^\s*prettier-ignore/m.test(node.body)
  );
}

export function hasPrettierIgnore(node: LavaHtmlNode) {
  return isPrettierIgnoreNode(node) || isPrettierIgnoreNode(node.prev);
}

export function forceNextEmptyLine(node: LavaHtmlNode | undefined) {
  if (!node) return false;
  if (!node.next) return false;
  const source = node.source;
  // Current implementation: force next empty line when two consecutive
  // lines exist between nodes.
  let tmp: number;
  tmp = source.indexOf('\n', node.position.end);
  if (tmp === -1) return false;
  tmp = source.indexOf('\n', tmp + 1);
  if (tmp === -1) return false;
  return tmp < node.next.position.start;
}

/** firstChild leadingSpaces and lastChild trailingSpaces */
export function forceBreakContent(node: LavaHtmlNode) {
  return (
    forceBreakChildren(node) ||
    (node.type === NodeTypes.HtmlElement &&
      node.children.length > 0 &&
      typeof node.name === 'string' &&
      (['body', 'script', 'style'].includes(node.name) ||
        node.children.some((child) => hasNonTextChild(child)))) ||
    (node.firstChild &&
      node.firstChild === node.lastChild &&
      node.firstChild.type !== NodeTypes.TextNode &&
      hasLeadingLineBreak(node.firstChild) &&
      (!node.lastChild.isTrailingWhitespaceSensitive ||
        hasTrailingLineBreak(node.lastChild)))
  );
}

/** spaces between children */
export function forceBreakChildren(node: LavaHtmlNode) {
  return (
    node.type === NodeTypes.HtmlElement &&
    node.children.length > 0 &&
    typeof node.name === 'string' &&
    (['html', 'head', 'ul', 'ol', 'select'].includes(node.name) ||
      (node.cssDisplay.startsWith('table') && node.cssDisplay !== 'table-cell'))
  );
}

export function preferHardlineAsSurroundingSpaces(node: LavaHtmlNode) {
  switch (node.type) {
    // case 'ieConditionalComment':
    case NodeTypes.HtmlComment:
      return true;
    case NodeTypes.HtmlElement:
      return (
        typeof node.name === 'string' &&
        ['script', 'select'].includes(node.name)
      );
    case NodeTypes.LavaTag:
      if (
        (node.prev && isTextLikeNode(node.prev)) ||
        (node.next && isTextLikeNode(node.next))
      ) {
        return false;
      }
      return node.children && node.children.length > 0;
  }

  return false;
}

export function preferHardlineAsLeadingSpaces(node: LavaHtmlNode) {
  return (
    preferHardlineAsSurroundingSpaces(node) ||
    (isLavaNode(node) && node.prev && isLavaNode(node.prev)) ||
    (node.prev && preferHardlineAsTrailingSpaces(node.prev)) ||
    hasSurroundingLineBreak(node)
  );
}

export function preferHardlineAsTrailingSpaces(node: LavaHtmlNode) {
  return (
    preferHardlineAsSurroundingSpaces(node) ||
    (isLavaNode(node) &&
      node.next &&
      (isLavaNode(node.next) || isHtmlNode(node.next))) ||
    (node.type === NodeTypes.HtmlElement && node.name === 'br') ||
    hasSurroundingLineBreak(node)
  );
}

export function hasMeaningfulLackOfLeadingWhitespace(
  node: LavaHtmlNode,
): boolean {
  return node.isLeadingWhitespaceSensitive && !node.hasLeadingWhitespace;
}

export function hasMeaningfulLackOfTrailingWhitespace(
  node: LavaHtmlNode,
): boolean {
  return node.isTrailingWhitespaceSensitive && !node.hasTrailingWhitespace;
}

export function hasMeaningfulLackOfDanglingWhitespace(
  node: LavaHtmlNode,
): boolean {
  return node.isDanglingWhitespaceSensitive && !node.hasDanglingWhitespace;
}

function hasSurroundingLineBreak(node: LavaHtmlNode) {
  return hasLeadingLineBreak(node) && hasTrailingLineBreak(node);
}

function hasLeadingLineBreak(node: LavaHtmlNode) {
  if (node.type === NodeTypes.Document) return false;

  return (
    node.hasLeadingWhitespace &&
    hasLineBreakInRange(
      node.source,
      node.prev
        ? node.prev.position.end
        : (node.parentNode as any).blockStartPosition
        ? (node.parentNode as any).blockStartPosition.end
        : (node.parentNode as any).position.start,
      node.position.start,
    )
  );
}

function hasTrailingLineBreak(node: LavaHtmlNode) {
  if (node.type === NodeTypes.Document) return false;
  return (
    node.hasTrailingWhitespace &&
    hasLineBreakInRange(
      node.source,
      node.position.end,
      node.next
        ? node.next.position.start
        : (node.parentNode as any).blockEndPosition
        ? (node.parentNode as any).blockEndPosition.start
        : (node.parentNode as any).position.end,
    )
  );
}

function hasLineBreakInRange(source: string, start: number, end: number) {
  const index = source.indexOf('\n', start);
  return index !== -1 && index < end;
}

export function getLastDescendant(node: LavaHtmlNode): LavaHtmlNode {
  return node.lastChild ? getLastDescendant(node.lastChild) : node;
}
