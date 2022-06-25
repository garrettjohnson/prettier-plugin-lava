import { Doc, AstPath, ParserOptions } from 'prettier';
import * as AST from '~/parser/ast';

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
  HtmlComment = 'HtmlComment',
  HtmlElement = 'HtmlElement',
  HtmlRawNode = 'HtmlRawNode',
  AttrSingleQuoted = 'AttrSingleQuoted',
  AttrDoubleQuoted = 'AttrDoubleQuoted',
  AttrUnquoted = 'AttrUnquoted',
  AttrEmpty = 'AttrEmpty',
  TextNode = 'TextNode',
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
  indentSchema: boolean;
};
export type LavaPrinterArgs = {
  leadingSpaceGroupId?: symbol[] | symbol;
  trailingSpaceGroupId?: symbol[] | symbol;
};
export type LavaPrinter = (
  path: AstPath<LavaHtmlNode>,
  args?: LavaPrinterArgs,
) => Doc;

// This one warrants a bit of an explanation 'cuz it's definitely next
// level typescript kung-fu shit.
//
// We have an AST, right? And we want to augment every node in the AST with
// new properties. But we don't want to traverse the tree and repeat
// ourselves. So we use a mapped type to map on the properties of T to do
// the following:
//
// - If the property is an array of LavaHtmlNode, we'll map that to an array of
// Augmented<T[property]> instead.
//
// - If the property is a something | LavaHtmlNode, then we'll map that type
// to something | Augmented<T[Property]>
//
// So this thing will go through node.name, node.children, node.attributes,
// and so on and give us augmented types.
//
// prettier-ignore
export type Augmented<T, Aug> = {
  [Property in keyof T]: [T[Property]] extends [(infer Item)[] | undefined]
    ? [Item] extends [AST.LavaHtmlNode]
      ? Augmented<Item, Aug>[]
      : Item[]
    : T[Property] extends infer P // this here is to distribute the condition
      ? P extends AST.LavaHtmlNode // so string and LavaDrop go through this check independently
        ? Augmented<P, Aug>
        : P
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
export type ParentNode = Augmented<AST.ParentNode, AllAugmentations>;
export type LavaRawTag = Augmented<AST.LavaRawTag, AllAugmentations>;
export type LavaTag = Augmented<AST.LavaTag, AllAugmentations>;
export type LavaBranch = Augmented<AST.LavaBranch, AllAugmentations>;
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
export type TextNode = Augmented<AST.TextNode, AllAugmentations>;
