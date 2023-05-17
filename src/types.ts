import { Doc, AstPath, ParserOptions } from 'prettier';
import * as AST from '~/parser/stage-2-ast';

export interface Position {
  start: number;
  end: number;
}

export enum NodeTypes {
  Document = 'Document',
  LavaRawTag = 'LavaRawTag',
  LavaTag = 'LavaTag',
  LavaBranch = 'LavaBranch',
  LavaDrop = 'LavaDrop',
  HtmlSelfClosingElement = 'HtmlSelfClosingElement',
  HtmlVoidElement = 'HtmlVoidElement',
  HtmlDoctype = 'HtmlDoctype',
  HtmlComment = 'HtmlComment',
  HtmlElement = 'HtmlElement',
  HtmlRawNode = 'HtmlRawNode',
  AttrSingleQuoted = 'AttrSingleQuoted',
  AttrDoubleQuoted = 'AttrDoubleQuoted',
  AttrUnquoted = 'AttrUnquoted',
  AttrEmpty = 'AttrEmpty',
  TextNode = 'TextNode',
  YAMLFrontmatter = 'YAMLFrontmatter',

  LavaVariable = 'LavaVariable',
  LavaFilter = 'LavaFilter',
  NamedArgument = 'NamedArgument',
  LavaLiteral = 'LavaLiteral',
  String = 'String',
  Number = 'Number',
  Range = 'Range',
  VariableLookup = 'VariableLookup',
  Comparison = 'Comparison',
  LogicalExpression = 'LogicalExpression',

  AssignMarkup = 'AssignMarkup',
  CycleMarkup = 'CycleMarkup',
  ForMarkup = 'ForMarkup',
  PaginateMarkup = 'PaginateMarkup',
  RawMarkup = 'RawMarkup',
  RenderMarkup = 'RenderMarkup',
  RenderVariableExpression = 'RenderVariableExpression',
}

export function isLavaHtmlNode(value: any): value is LavaHtmlNode {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    NodeTypes.hasOwnProperty(value.type)
  );
}

// These are officially supported with special node types
export enum NamedTags {
  assign = 'assign',
  capture = 'capture',
  case = 'case',
  cycle = 'cycle',
  decrement = 'decrement',
  echo = 'echo',
  elsif = 'elsif',
  for = 'for',
  form = 'form',
  if = 'if',
  include = 'include',
  increment = 'increment',
  layout = 'layout',
  lava = 'lava',
  paginate = 'paginate',
  render = 'render',
  section = 'section',
  sections = 'sections',
  tablerow = 'tablerow',
  unless = 'unless',
  when = 'when',
}

export enum Comparators {
  CONTAINS = 'contains',
  EQUAL = '==',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  NOT_EQUAL = '!=',
}

export const HtmlNodeTypes = [
  NodeTypes.HtmlElement,
  NodeTypes.HtmlRawNode,
  NodeTypes.HtmlVoidElement,
  NodeTypes.HtmlSelfClosingElement,
] as const;

export const LavaNodeTypes = [
  NodeTypes.LavaTag,
  NodeTypes.LavaDrop,
  NodeTypes.LavaBranch,
  NodeTypes.LavaRawTag,
] as const;

export type LavaAstPath = AstPath<LavaHtmlNode>;
export type LavaParserOptions = ParserOptions<LavaHtmlNode> & {
  singleAttributePerLine: boolean;
  singleLineLinkTags: boolean;
  lavaSingleQuote: boolean;
  embeddedSingleQuote: boolean;
  indentSchema: boolean;
};
export type LavaPrinterArgs = {
  leadingSpaceGroupId?: symbol[] | symbol;
  trailingSpaceGroupId?: symbol[] | symbol;
  isLavaStatement?: boolean;
  truncate?: boolean;
};
export type LavaPrinter = (
  path: AstPath<LavaHtmlNode>,
  args?: LavaPrinterArgs,
) => Doc;

// Those properties create loops that would make walking infinite
export const nonTraversableProperties = new Set([
  'parentNode',
  'prev',
  'next',
  'firstChild',
  'lastChild',
]);

// This one warrants a bit of an explanation 'cuz it's definitely next
// level typescript kung-fu shit.
//
// We have an AST, right? And we want to augment every node in the AST with
// new properties. But we don't want to have to _rewrite_ all of the types
// of all the AST nodes that were augmented. So we use this neat little
// trick that will surprise you:
//
// - If the property was   LavaNode[],
//   then we'll map it to  Augmented<LavaNode>[];
//
// - If the property was   (string | number)[],
//   then we'll map it to  (string | number)[];
//
// - If the property was   string | LavaNode,
//   then we'll map it to  string | Augmented<LavaNode>;
//
// - If the property was   LavaNode,
//   then we'll map it to  Augmented<LavaNode>;
//
// - If the property was   string,
//   then we'll map it to  string;
//
// So, Augmented<LavaTag, WithParent> =>
//  - LavaTag with a parentNode,
//  - LavaTag.children all have a parentNode since LavaTag.children is LavaHtmlNode, then
//  - LavaTag.markup all have a parentNode since LavaTag.markup may be LavaTagAssignMarkup.
//  - LavaTag.name will remain a string
//
// Topics to google to understand what's going on:
//  - TypeScript generic types (for creating types from types)
//  - TypeScript mapped types (for mapping the input type's properties to new types)
//  - TypeScript union types (A | B | C)
//  - TypeScript conditional types (and the section on distribution for union types)
//
// prettier-ignore
export type Augmented<T, Aug> = {
  [Property in keyof T]: [T[Property]] extends [(infer Item)[] | undefined]
    // First branch: property?: Item[]
    ? [Item] extends [AST.LavaHtmlNode] // If *all* Item extend AST.LavaHtmlNode
      ? Augmented<Item, Aug>[]            // If yes, => Augmented<Node>[]
      : Item[]                            // If not, => string[], number[], etc.

    // Second branch: property is NOT Item[]
    : T[Property] extends infer P    // T[Property] to distributed P alias
      ? P extends AST.LavaHtmlNode // Distribute if P extends AST.LavaHtmlNode
        ? Augmented<P, Aug>          // => If yes, => Augmented<Node>
        : P                          // => If not, => string, number, Position, etc.
      : never;
} & Aug;

export type AllAugmentations = WithParent &
  WithSiblings &
  WithFamily &
  WithCssProperties &
  WithWhitespaceHelpers;

export type WithParent = {
  parentNode?: ParentNode;
};

export type WithSiblings = {
  // We're cheating here by saying the prev/next will have all the props.
  // That's kind of a lie. But it would be too complicated to do this any
  // other way.
  prev: LavaHtmlNode | undefined;
  next: LavaHtmlNode | undefined;
};

export type WithFamily = {
  firstChild: LavaHtmlNode | undefined;
  lastChild: LavaHtmlNode | undefined;
};

export type WithCssProperties = {
  cssDisplay: string;
  cssWhitespace: string;
};

export type WithWhitespaceHelpers = {
  isDanglingWhitespaceSensitive: boolean;
  isWhitespaceSensitive: boolean;
  isLeadingWhitespaceSensitive: boolean;
  isTrailingWhitespaceSensitive: boolean;
  isIndentationSensitive: boolean;
  hasLeadingWhitespace: boolean;
  hasTrailingWhitespace: boolean;
  hasDanglingWhitespace: boolean;
};

export type AugmentedNode<Aug> = Augmented<AST.LavaHtmlNode, Aug>;

export type Augment<Aug> = <NodeType extends AugmentedNode<Aug>>(
  options: LavaParserOptions,
  node: NodeType,
  parentNode?: NodeType,
) => void;

export type LavaHtmlNode = Augmented<AST.LavaHtmlNode, AllAugmentations>;
export type DocumentNode = Augmented<AST.DocumentNode, AllAugmentations>;
export type LavaNode = Augmented<AST.LavaNode, AllAugmentations>;
export type LavaStatement = Augmented<AST.LavaStatement, AllAugmentations>;
export type ParentNode = Augmented<AST.ParentNode, AllAugmentations>;
export type LavaRawTag = Augmented<AST.LavaRawTag, AllAugmentations>;
export type LavaTag = Augmented<AST.LavaTag, AllAugmentations>;
export type LavaTagNamed = Augmented<AST.LavaTagNamed, AllAugmentations>;
export type LavaBranch = Augmented<AST.LavaBranch, AllAugmentations>;
export type LavaBranchNamed = Augmented<
  AST.LavaBranchNamed,
  AllAugmentations
>;
export type LavaDrop = Augmented<AST.LavaDrop, AllAugmentations>;
export type HtmlNode = Augmented<AST.HtmlNode, AllAugmentations>;
export type HtmlTag = Exclude<HtmlNode, HtmlComment>;
export type HtmlElement = Augmented<AST.HtmlElement, AllAugmentations>;
export type HtmlVoidElement = Augmented<AST.HtmlVoidElement, AllAugmentations>;
export type HtmlSelfClosingElement = Augmented<
  AST.HtmlSelfClosingElement,
  AllAugmentations
>;
export type HtmlRawNode = Augmented<AST.HtmlRawNode, AllAugmentations>;
export type HtmlDoctype = Augmented<AST.HtmlDoctype, AllAugmentations>;
export type HtmlComment = Augmented<AST.HtmlComment, AllAugmentations>;
export type AttributeNode = Augmented<AST.AttributeNode, AllAugmentations>;
export type AttrSingleQuoted = Augmented<
  AST.AttrSingleQuoted,
  AllAugmentations
>;
export type AttrDoubleQuoted = Augmented<
  AST.AttrDoubleQuoted,
  AllAugmentations
>;
export type AttrUnquoted = Augmented<AST.AttrUnquoted, AllAugmentations>;
export type AttrEmpty = Augmented<AST.AttrEmpty, AllAugmentations>;
export type LavaExpression = Augmented<
  AST.LavaExpression,
  AllAugmentations
>;
export type TextNode = Augmented<AST.TextNode, AllAugmentations>;
