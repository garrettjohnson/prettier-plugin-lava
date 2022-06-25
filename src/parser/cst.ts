import { Parser } from 'prettier';
import { toAST } from 'ohm-js/extras';
import { lavaHtmlGrammar } from '~/parser/grammar';
import { LavaHTMLCSTParsingError } from '~/parser/errors';

export enum ConcreteNodeTypes {
  HtmlComment = 'HtmlComment',
  HtmlRawTag = 'HtmlRawTag',
  HtmlVoidElement = 'HtmlVoidElement',
  HtmlSelfClosingElement = 'HtmlSelfClosingElement',
  HtmlTagOpen = 'HtmlTagOpen',
  HtmlTagClose = 'HtmlTagClose',
  AttrSingleQuoted = 'AttrSingleQuoted',
  AttrDoubleQuoted = 'AttrDoubleQuoted',
  AttrUnquoted = 'AttrUnquoted',
  AttrEmpty = 'AttrEmpty',
  LavaDrop = 'LavaDrop',
  LavaRawTag = 'LavaRawTag',
  LavaTag = 'LavaTag',
  LavaTagOpen = 'LavaTagOpen',
  LavaTagClose = 'LavaTagClose',
  TextNode = 'TextNode',
}

export interface Parsers {
  [astFormat: string]: Parser;
}

export interface ConcreteBasicNode<T> {
  type: T;
  locStart: number;
  locEnd: number;
}

export interface ConcreteHtmlNodeBase<T> extends ConcreteBasicNode<T> {
  name: string | ConcreteLavaDrop;
  attrList?: ConcreteAttributeNode[];
}

export interface ConcreteHtmlComment
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlComment> {
  body: string;
}

export interface ConcreteHtmlRawTag
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlRawTag> {
  name: string;
  body: string;
  blockStartLocStart: number;
  blockStartLocEnd: number;
  blockEndLocStart: number;
  blockEndLocEnd: number;
}
export interface ConcreteHtmlVoidElement
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlVoidElement> {
  name: string;
}
export interface ConcreteHtmlSelfClosingElement
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlSelfClosingElement> {}
export interface ConcreteHtmlTagOpen
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlTagOpen> {}
export interface ConcreteHtmlTagClose
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlTagClose> {}

export interface ConcreteAttributeNodeBase<T> extends ConcreteBasicNode<T> {
  name: string;
  value: (ConcreteLavaNode | ConcreteTextNode)[];
}

export type ConcreteAttributeNode =
  | ConcreteLavaNode
  | ConcreteAttrSingleQuoted
  | ConcreteAttrDoubleQuoted
  | ConcreteAttrUnquoted
  | ConcreteAttrEmpty;

export interface ConcreteAttrSingleQuoted
  extends ConcreteAttributeNodeBase<ConcreteNodeTypes.AttrSingleQuoted> {}
export interface ConcreteAttrDoubleQuoted
  extends ConcreteAttributeNodeBase<ConcreteNodeTypes.AttrDoubleQuoted> {}
export interface ConcreteAttrUnquoted
  extends ConcreteAttributeNodeBase<ConcreteNodeTypes.AttrUnquoted> {}
export interface ConcreteAttrEmpty
  extends ConcreteBasicNode<ConcreteNodeTypes.AttrEmpty> {
  name: string;
}

export type ConcreteLavaNode =
  | ConcreteLavaRawTag
  | ConcreteLavaTagOpen
  | ConcreteLavaTagClose
  | ConcreteLavaTag
  | ConcreteLavaDrop;

interface ConcreteBasicLavaNode<T> extends ConcreteBasicNode<T> {
  whitespaceStart: null | '-';
  whitespaceEnd: null | '-';
}

export interface ConcreteLavaRawTag
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaRawTag> {
  name: string;
  body: string;
  delimiterWhitespaceStart: null | '-';
  delimiterWhitespaceEnd: null | '-';
  blockStartLocStart: number;
  blockStartLocEnd: number;
  blockEndLocStart: number;
  blockEndLocEnd: number;
}

export interface ConcreteLavaTagOpen
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTagOpen> {
  name: string;
  markup: string;
}

export interface ConcreteLavaTagClose
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTagClose> {
  name: string;
}

export interface ConcreteLavaTag
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTag> {
  name: string;
  markup: string;
}

export interface ConcreteLavaDrop
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaDrop> {
  markup: string;
}

export type ConcreteHtmlNode =
  | ConcreteHtmlComment
  | ConcreteHtmlRawTag
  | ConcreteHtmlVoidElement
  | ConcreteHtmlSelfClosingElement
  | ConcreteHtmlTagOpen
  | ConcreteHtmlTagClose;

export interface ConcreteTextNode
  extends ConcreteBasicNode<ConcreteNodeTypes.TextNode> {
  value: string;
}

export type LavaHtmlConcreteNode =
  | ConcreteHtmlNode
  | ConcreteLavaNode
  | ConcreteTextNode;

export type LavaHtmlCST = LavaHtmlConcreteNode[];

const markup = (i: number) => (tokens: any) => tokens[i].sourceString.trim();

export function toLavaHtmlCST(text: string): LavaHtmlCST {
  const locStart = (tokens: any) => tokens[0].source.startIdx;
  const locEnd = (tokens: any) => tokens[tokens.length - 1].source.endIdx;
  const textNode = {
    type: ConcreteNodeTypes.TextNode,
    value: function () {
      return (this as any).sourceString;
    },
    locStart,
    locEnd,
  };
  const res = lavaHtmlGrammar.match(text);

  if (res.failed()) {
    throw new LavaHTMLCSTParsingError(res);
  }

  const ohmAST = toAST(res, {
    HtmlComment: {
      body: markup(1),
      locStart,
      locEnd,
    },

    HtmlRawTagImpl: {
      type: 'HtmlRawTag',
      name: 1,
      attrList: 2,
      body: 4,
      locStart,
      locEnd,
      blockStartLocStart: (tokens: any) => tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: any) => tokens[3].source.endIdx,
      blockEndLocStart: (tokens: any) => tokens[5].source.startIdx,
      blockEndLocEnd: (tokens: any) => tokens[5].source.endIdx,
    },

    HtmlVoidElement: {
      name: 1,
      attrList: 2,
      locStart,
      locEnd,
    },

    HtmlSelfClosingElement: {
      name: 1,
      attrList: 2,
      locStart,
      locEnd,
    },

    HtmlTagOpen: {
      name: 1,
      attrList: 2,
      locStart,
      locEnd,
    },

    HtmlTagClose: {
      name: 1,
      locStart,
      locEnd,
    },

    tagNameOrLavaDrop: 0,

    AttrUnquoted: {
      name: 0,
      value: 2,
      locStart,
      locEnd,
    },

    AttrSingleQuoted: {
      name: 0,
      value: 3,
      locStart,
      locEnd,
    },

    AttrDoubleQuoted: {
      name: 0,
      value: 3,
      locStart,
      locEnd,
    },

    attrEmpty: {
      type: ConcreteNodeTypes.AttrEmpty,
      name: 0,
      locStart,
      locEnd,
    },

    attrDoubleQuotedValue: 0,
    attrSingleQuotedValue: 0,
    attrUnquotedValue: 0,
    attrDoubleQuotedTextNode: textNode,
    attrSingleQuotedTextNode: textNode,
    attrUnquotedTextNode: textNode,
    lavaNode: 0,
    lavaRawTag: 0,
    lavaRawTagImpl: {
      type: ConcreteNodeTypes.LavaRawTag,
      name: 3,
      body: 7,
      whitespaceStart: 1,
      whitespaceEnd: 5,
      delimiterWhitespaceStart: 9,
      delimiterWhitespaceEnd: 14,
      locStart,
      locEnd,
      blockStartLocStart: (tokens: any) => tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: any) => tokens[6].source.endIdx,
      blockEndLocStart: (tokens: any) => tokens[8].source.startIdx,
      blockEndLocEnd: (tokens: any) => tokens[15].source.endIdx,
    },

    lavaTagOpen: {
      type: ConcreteNodeTypes.LavaTagOpen,
      name: 3,
      markup: markup(5),
      whitespaceStart: 1,
      whitespaceEnd: 6,
      locStart,
      locEnd,
    },

    lavaTagClose: {
      type: ConcreteNodeTypes.LavaTagClose,
      name: 4,
      whitespaceStart: 1,
      whitespaceEnd: 7,
      locStart,
      locEnd,
    },

    lavaTag: {
      type: ConcreteNodeTypes.LavaTag,
      name: 3,
      markup: markup(5),
      whitespaceStart: 1,
      whitespaceEnd: 6,
      locStart,
      locEnd,
    },

    lavaDrop: {
      type: ConcreteNodeTypes.LavaDrop,
      markup: markup(2),
      whitespaceStart: 1,
      whitespaceEnd: 3,
      locStart,
      locEnd,
    },

    lavaInlineComment: {
      type: ConcreteNodeTypes.LavaTag,
      name: 3,
      markup: markup(5),
      whitespaceStart: 1,
      whitespaceEnd: 6,
      locStart,
      locEnd,
    },

    TextNode: textNode,
  });

  return ohmAST as LavaHtmlCST;
}
