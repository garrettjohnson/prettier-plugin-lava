/**
 * This is the first stage of the parser.
 *
 * Input:
 *   Source code: string
 *
 * Output:
 *   Concrete Syntax Tree (CST): LavaHtmlCST
 *
 * We use OhmJS's toAST method to turn the OhmJS nodes into an "almost-AST." We
 * call that a Concrete Syntax Tree because it considers Open and Close nodes as
 * separate nodes.
 *
 * It is mostly "flat."
 *
 * e.g.
 * {% if cond %}hi <em>there!</em>{% endif %}
 *
 * becomes
 * - LavaTagOpen/if
 *   condition: LavaVariableExpression/cond
 * - TextNode/"hi "
 * - HtmlTagOpen/em
 * - TextNode/"there!"
 * - HtmlTagClose/em
 * - LavaTagClose/if
 *
 * In the Concrete Syntax Tree, all nodes are siblings instead of having a
 * parent/children relationship.
 *
 */

import { Parser } from 'prettier';
import ohm, { Node } from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import {
  LavaGrammars,
  placeholderGrammars,
  strictGrammars,
  tolerantGrammars,
} from '~/parser/grammar';
import { LavaHTMLCSTParsingError } from '~/parser/errors';
import { Comparators, NamedTags } from '~/types';

export enum ConcreteNodeTypes {
  HtmlDoctype = 'HtmlDoctype',
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
  YAMLFrontmatter = 'YAMLFrontmatter',

  LavaVariable = 'LavaVariable',
  LavaFilter = 'LavaFilter',
  NamedArgument = 'NamedArgument',
  LavaLiteral = 'LavaLiteral',
  VariableLookup = 'VariableLookup',
  String = 'String',
  Number = 'Number',
  Range = 'Range',
  Comparison = 'Comparison',
  Condition = 'Condition',

  AssignMarkup = 'AssignMarkup',
  CycleMarkup = 'CycleMarkup',
  ForMarkup = 'ForMarkup',
  RenderMarkup = 'RenderMarkup',
  PaginateMarkup = 'PaginateMarkup',
  RenderVariableExpression = 'RenderVariableExpression',
}

export const LavaLiteralValues = {
  nil: null,
  null: null,
  true: true as true,
  false: false as false,
  blank: '' as '',
  empty: '' as '',
};

export interface Parsers {
  [astFormat: string]: Parser;
}

export interface ConcreteBasicNode<T> {
  type: T;
  source: string;
  locStart: number;
  locEnd: number;
}

export interface ConcreteHtmlNodeBase<T> extends ConcreteBasicNode<T> {
  attrList?: ConcreteAttributeNode[];
}

export interface ConcreteHtmlDoctype
  extends ConcreteBasicNode<ConcreteNodeTypes.HtmlDoctype> {
  legacyDoctypeString: string | null;
}

export interface ConcreteHtmlComment
  extends ConcreteBasicNode<ConcreteNodeTypes.HtmlComment> {
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
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlSelfClosingElement> {
  name: (ConcreteTextNode | ConcreteLavaDrop)[];
}
export interface ConcreteHtmlTagOpen
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlTagOpen> {
  name: (ConcreteTextNode | ConcreteLavaDrop)[];
}
export interface ConcreteHtmlTagClose
  extends ConcreteHtmlNodeBase<ConcreteNodeTypes.HtmlTagClose> {
  name: (ConcreteTextNode | ConcreteLavaDrop)[];
}

export interface ConcreteAttributeNodeBase<T> extends ConcreteBasicNode<T> {
  name: (ConcreteLavaDrop | ConcreteTextNode)[];
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
  name: (ConcreteLavaDrop | ConcreteTextNode)[];
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
  markup: string;
  delimiterWhitespaceStart: null | '-';
  delimiterWhitespaceEnd: null | '-';
  blockStartLocStart: number;
  blockStartLocEnd: number;
  blockEndLocStart: number;
  blockEndLocEnd: number;
}

export type ConcreteLavaTagOpen =
  | ConcreteLavaTagOpenBaseCase
  | ConcreteLavaTagOpenNamed;
export type ConcreteLavaTagOpenNamed =
  | ConcreteLavaTagOpenCase
  | ConcreteLavaTagOpenCapture
  | ConcreteLavaTagOpenIf
  | ConcreteLavaTagOpenUnless
  | ConcreteLavaTagOpenForm
  | ConcreteLavaTagOpenFor
  | ConcreteLavaTagOpenPaginate
  | ConcreteLavaTagOpenTablerow;

export interface ConcreteLavaTagOpenNode<Name, Markup>
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTagOpen> {
  name: Name;
  markup: Markup;
}

export interface ConcreteLavaTagOpenBaseCase
  extends ConcreteLavaTagOpenNode<string, string> {}

export interface ConcreteLavaTagOpenCapture
  extends ConcreteLavaTagOpenNode<
    NamedTags.capture,
    ConcreteLavaVariableLookup
  > {}

export interface ConcreteLavaTagOpenCase
  extends ConcreteLavaTagOpenNode<NamedTags.case, ConcreteLavaExpression> {}
export interface ConcreteLavaTagWhen
  extends ConcreteLavaTagNode<NamedTags.when, ConcreteLavaExpression[]> {}

export interface ConcreteLavaTagOpenIf
  extends ConcreteLavaTagOpenNode<NamedTags.if, ConcreteLavaCondition[]> {}
export interface ConcreteLavaTagOpenUnless
  extends ConcreteLavaTagOpenNode<
    NamedTags.unless,
    ConcreteLavaCondition[]
  > {}
export interface ConcreteLavaTagElsif
  extends ConcreteLavaTagNode<NamedTags.elsif, ConcreteLavaCondition[]> {}

export interface ConcreteLavaCondition
  extends ConcreteBasicNode<ConcreteNodeTypes.Condition> {
  relation: 'and' | 'or' | null;
  expression: ConcreteLavaComparison | ConcreteLavaExpression;
}

export interface ConcreteLavaComparison
  extends ConcreteBasicNode<ConcreteNodeTypes.Comparison> {
  comparator: Comparators;
  left: ConcreteLavaExpression;
  right: ConcreteLavaExpression;
}

export interface ConcreteLavaTagOpenForm
  extends ConcreteLavaTagOpenNode<NamedTags.form, ConcreteLavaArgument[]> {}

export interface ConcreteLavaTagOpenFor
  extends ConcreteLavaTagOpenNode<
    NamedTags.for,
    ConcreteLavaTagForMarkup
  > {}
export interface ConcreteLavaTagForMarkup
  extends ConcreteBasicNode<ConcreteNodeTypes.ForMarkup> {
  variableName: string;
  collection: ConcreteLavaExpression;
  reversed: 'reversed' | null;
  args: ConcreteLavaNamedArgument[];
}

export interface ConcreteLavaTagOpenTablerow
  extends ConcreteLavaTagOpenNode<
    NamedTags.tablerow,
    ConcreteLavaTagForMarkup
  > {}

export interface ConcreteLavaTagOpenPaginate
  extends ConcreteLavaTagOpenNode<
    NamedTags.paginate,
    ConcretePaginateMarkup
  > {}

export interface ConcretePaginateMarkup
  extends ConcreteBasicNode<ConcreteNodeTypes.PaginateMarkup> {
  collection: ConcreteLavaExpression;
  pageSize: ConcreteLavaExpression;
  args: ConcreteLavaNamedArgument[] | null;
}

export interface ConcreteLavaTagClose
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTagClose> {
  name: string;
}

export type ConcreteLavaTag =
  | ConcreteLavaTagNamed
  | ConcreteLavaTagBaseCase;
export type ConcreteLavaTagNamed =
  | ConcreteLavaTagAssign
  | ConcreteLavaTagCycle
  | ConcreteLavaTagEcho
  | ConcreteLavaTagIncrement
  | ConcreteLavaTagDecrement
  | ConcreteLavaTagElsif
  | ConcreteLavaTagInclude
  | ConcreteLavaTagLayout
  | ConcreteLavaTagLava
  | ConcreteLavaTagRender
  | ConcreteLavaTagSection
  | ConcreteLavaTagSections
  | ConcreteLavaTagWhen;

export interface ConcreteLavaTagNode<Name, Markup>
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaTag> {
  markup: Markup;
  name: Name;
}

export interface ConcreteLavaTagBaseCase
  extends ConcreteLavaTagNode<string, string> {}
export interface ConcreteLavaTagEcho
  extends ConcreteLavaTagNode<NamedTags.echo, ConcreteLavaVariable> {}
export interface ConcreteLavaTagIncrement
  extends ConcreteLavaTagNode<
    NamedTags.increment,
    ConcreteLavaVariableLookup
  > {}
export interface ConcreteLavaTagDecrement
  extends ConcreteLavaTagNode<
    NamedTags.decrement,
    ConcreteLavaVariableLookup
  > {}
export interface ConcreteLavaTagSection
  extends ConcreteLavaTagNode<NamedTags.section, ConcreteStringLiteral> {}
export interface ConcreteLavaTagSections
  extends ConcreteLavaTagNode<NamedTags.sections, ConcreteStringLiteral> {}
export interface ConcreteLavaTagLayout
  extends ConcreteLavaTagNode<NamedTags.layout, ConcreteLavaExpression> {}

export interface ConcreteLavaTagLava
  extends ConcreteLavaTagNode<
    NamedTags.lava,
    ConcreteLavaLavaTagNode[]
  > {}
export type ConcreteLavaLavaTagNode =
  | ConcreteLavaTagOpen
  | ConcreteLavaTagClose
  | ConcreteLavaTag
  | ConcreteLavaRawTag;

export interface ConcreteLavaTagAssign
  extends ConcreteLavaTagNode<
    NamedTags.assign,
    ConcreteLavaTagAssignMarkup
  > {}
export interface ConcreteLavaTagAssignMarkup
  extends ConcreteBasicNode<ConcreteNodeTypes.AssignMarkup> {
  name: string;
  value: ConcreteLavaVariable;
}

export interface ConcreteLavaTagCycle
  extends ConcreteLavaTagNode<
    NamedTags.cycle,
    ConcreteLavaTagCycleMarkup
  > {}
export interface ConcreteLavaTagCycleMarkup
  extends ConcreteBasicNode<ConcreteNodeTypes.CycleMarkup> {
  groupName: ConcreteLavaExpression | null;
  args: ConcreteLavaExpression[];
}

export interface ConcreteLavaTagRender
  extends ConcreteLavaTagNode<
    NamedTags.render,
    ConcreteLavaTagRenderMarkup
  > {}
export interface ConcreteLavaTagInclude
  extends ConcreteLavaTagNode<
    NamedTags.include,
    ConcreteLavaTagRenderMarkup
  > {}

export interface ConcreteLavaTagRenderMarkup
  extends ConcreteBasicNode<ConcreteNodeTypes.RenderMarkup> {
  snippet: ConcreteStringLiteral | ConcreteLavaVariableLookup;
  alias: string | null;
  variable: ConcreteRenderVariableExpression | null;
  args: ConcreteLavaNamedArgument[];
}

export interface ConcreteRenderVariableExpression
  extends ConcreteBasicNode<ConcreteNodeTypes.RenderVariableExpression> {
  kind: 'for' | 'with';
  name: ConcreteLavaExpression;
}

export interface ConcreteLavaDrop
  extends ConcreteBasicLavaNode<ConcreteNodeTypes.LavaDrop> {
  markup: ConcreteLavaVariable | string;
}

// The variable is the name + filters, like shopify/lava.
export interface ConcreteLavaVariable
  extends ConcreteBasicNode<ConcreteNodeTypes.LavaVariable> {
  expression: ConcreteLavaExpression;
  filters: ConcreteLavaFilter[];
  rawSource: string;
}

export interface ConcreteLavaFilter
  extends ConcreteBasicNode<ConcreteNodeTypes.LavaFilter> {
  name: string;
  args: ConcreteLavaArgument[];
}

export type ConcreteLavaArgument =
  | ConcreteLavaExpression
  | ConcreteLavaNamedArgument;

export interface ConcreteLavaNamedArgument
  extends ConcreteBasicNode<ConcreteNodeTypes.NamedArgument> {
  name: string;
  value: ConcreteLavaExpression;
}

export type ConcreteLavaExpression =
  | ConcreteStringLiteral
  | ConcreteNumberLiteral
  | ConcreteLavaLiteral
  | ConcreteLavaRange
  | ConcreteLavaVariableLookup;

export interface ConcreteStringLiteral
  extends ConcreteBasicNode<ConcreteNodeTypes.String> {
  value: string;
  single: boolean;
}

export interface ConcreteNumberLiteral
  extends ConcreteBasicNode<ConcreteNodeTypes.Number> {
  value: string; // float parsing is weird but supported
}

export interface ConcreteLavaLiteral
  extends ConcreteBasicNode<ConcreteNodeTypes.LavaLiteral> {
  keyword: keyof typeof LavaLiteralValues;
  value: (typeof LavaLiteralValues)[keyof typeof LavaLiteralValues];
}

export interface ConcreteLavaRange
  extends ConcreteBasicNode<ConcreteNodeTypes.Range> {
  start: ConcreteLavaExpression;
  end: ConcreteLavaExpression;
}

export interface ConcreteLavaVariableLookup
  extends ConcreteBasicNode<ConcreteNodeTypes.VariableLookup> {
  name: string | null;
  lookups: ConcreteLavaExpression[];
}

export type ConcreteHtmlNode =
  | ConcreteHtmlDoctype
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

export interface ConcreteYamlFrontmatterNode
  extends ConcreteBasicNode<ConcreteNodeTypes.YAMLFrontmatter> {
  body: string;
}

export type LavaHtmlConcreteNode =
  | ConcreteHtmlNode
  | ConcreteLavaNode
  | ConcreteTextNode
  | ConcreteYamlFrontmatterNode;

export type LavaConcreteNode =
  | ConcreteLavaNode
  | ConcreteTextNode
  | ConcreteYamlFrontmatterNode;

export type LavaHtmlCST = LavaHtmlConcreteNode[];

export type LavaCST = LavaConcreteNode[];

interface Mapping {
  [k: string]: number | TemplateMapping | TopLevelFunctionMapping;
}

interface TemplateMapping {
  type: ConcreteNodeTypes;
  locStart: (node: Node[]) => number;
  locEnd: (node: Node[]) => number;
  source: string;
  [k: string]: FunctionMapping | string | number | boolean | object | null;
}

type TopLevelFunctionMapping = (...nodes: Node[]) => any;
type FunctionMapping = (nodes: Node[]) => any;

const markup = (i: number) => (tokens: Node[]) => tokens[i].sourceString.trim();
const markupTrimEnd = (i: number) => (tokens: Node[]) =>
  tokens[i].sourceString.trimEnd();

export interface CSTBuildOptions {
  /**
   * 'strict' will disable the Lava parsing base cases. Which means that we will
   * throw an error if we can't parse the node `markup` properly.
   *
   * 'tolerant' is the default case so that prettier can pretty print nodes
   * that it doesn't understand.
   */
  mode: 'strict' | 'tolerant' | 'completion';
}

const Grammars: Record<CSTBuildOptions['mode'], LavaGrammars> = {
  strict: strictGrammars,
  tolerant: tolerantGrammars,
  completion: placeholderGrammars,
};

export function toLavaHtmlCST(
  source: string,
  options: CSTBuildOptions = { mode: 'tolerant' },
): LavaHtmlCST {
  const grammars = Grammars[options.mode];
  const grammar = grammars.LavaHTML;
  return toCST(source, grammars, grammar, [
    'HelperMappings',
    'LavaMappings',
    'LavaHTMLMappings',
  ]);
}

export function toLavaCST(
  source: string,
  options: CSTBuildOptions = { mode: 'tolerant' },
): LavaCST {
  const grammars = Grammars[options.mode];
  const grammar = grammars.Lava;
  return toCST(source, grammars, grammar, ['HelperMappings', 'LavaMappings']);
}

function toCST<T>(
  source: string,
  grammars: LavaGrammars,
  grammar: ohm.Grammar,
  cstMappings: ('HelperMappings' | 'LavaMappings' | 'LavaHTMLMappings')[],
): T {
  // When we switch parser, our locStart and locEnd functions must account
  // for the offset of the {% lava %} markup
  let lavaStatementOffset = 0;
  const locStart = (tokens: Node[]) =>
    lavaStatementOffset + tokens[0].source.startIdx;
  const locEnd = (tokens: Node[]) =>
    lavaStatementOffset + tokens[tokens.length - 1].source.endIdx;
  const locEndSecondToLast = (tokens: Node[]) =>
    lavaStatementOffset + tokens[tokens.length - 2].source.endIdx;

  const textNode = {
    type: ConcreteNodeTypes.TextNode,
    value: function () {
      return (this as any).sourceString;
    },
    locStart,
    locEnd,
    source,
  };

  const res = grammar.match(source, 'Node');
  if (res.failed()) {
    throw new LavaHTMLCSTParsingError(res);
  }

  const HelperMappings: Mapping = {
    Node: 0,
    TextNode: textNode,
    orderedListOf: 0,

    listOf: 0,
    empty: () => null,
    emptyListOf: () => [],
    nonemptyListOf(first: any, _sep: any, rest: any) {
      const self = this as any;
      return [first.toAST(self.args.mapping)].concat(
        rest.toAST(self.args.mapping),
      );
    },

    nonemptyOrderedListOf: 0,
    nonemptyOrderedListOfBoth(
      nonemptyListOfA: Node,
      _sep: Node,
      nonemptyListOfB: Node,
    ) {
      const self = this as any;
      return nonemptyListOfA
        .toAST(self.args.mapping)
        .concat(nonemptyListOfB.toAST(self.args.mapping));
    },
  };

  const LavaMappings: Mapping = {
    lavaNode: 0,
    lavaRawTag: 0,
    lavaRawTagImpl: {
      type: ConcreteNodeTypes.LavaRawTag,
      name: 3,
      body: 9,
      markup: 6,
      whitespaceStart: 1,
      whitespaceEnd: 7,
      delimiterWhitespaceStart: 11,
      delimiterWhitespaceEnd: 17,
      locStart,
      locEnd,
      source,
      blockStartLocStart: (tokens: Node[]) => tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: Node[]) => tokens[8].source.endIdx,
      blockEndLocStart: (tokens: Node[]) => tokens[10].source.startIdx,
      blockEndLocEnd: (tokens: Node[]) => tokens[18].source.endIdx,
    },
    lavaBlockComment: {
      type: ConcreteNodeTypes.LavaRawTag,
      name: 'comment',
      body: (tokens: Node[]) => tokens[1].sourceString,
      whitespaceStart: (tokens: Node[]) => tokens[0].children[1].sourceString,
      whitespaceEnd: (tokens: Node[]) => tokens[0].children[7].sourceString,
      delimiterWhitespaceStart: (tokens: Node[]) =>
        tokens[2].children[1].sourceString,
      delimiterWhitespaceEnd: (tokens: Node[]) =>
        tokens[2].children[7].sourceString,
      locStart,
      locEnd,
      source,
      blockStartLocStart: (tokens: Node[]) => tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: Node[]) => tokens[0].source.endIdx,
      blockEndLocStart: (tokens: Node[]) => tokens[2].source.startIdx,
      blockEndLocEnd: (tokens: Node[]) => tokens[2].source.endIdx,
    },
    lavaInlineComment: {
      type: ConcreteNodeTypes.LavaTag,
      name: 3,
      markup: markupTrimEnd(5),
      whitespaceStart: 1,
      whitespaceEnd: 6,
      locStart,
      locEnd,
      source,
    },

    lavaTagOpen: 0,
    lavaTagOpenStrict: 0,
    lavaTagOpenBaseCase: 0,
    lavaTagOpenRule: {
      type: ConcreteNodeTypes.LavaTagOpen,
      name: 3,
      markup(nodes: Node[]) {
        const markupNode = nodes[6];
        const nameNode = nodes[3];
        if (NamedTags.hasOwnProperty(nameNode.sourceString)) {
          return markupNode.toAST((this as any).args.mapping);
        }
        return markupNode.sourceString.trim();
      },
      whitespaceStart: 1,
      whitespaceEnd: 7,
      locStart,
      locEnd,
      source,
    },

    lavaTagOpenCapture: 0,
    lavaTagOpenForm: 0,
    lavaTagOpenFormMarkup: 0,
    lavaTagOpenFor: 0,
    lavaTagOpenForMarkup: {
      type: ConcreteNodeTypes.ForMarkup,
      variableName: 0,
      collection: 4,
      reversed: 6,
      args: 8,
      locStart,
      locEnd,
      source,
    },
    lavaTagBreak: 0,
    lavaTagContinue: 0,
    lavaTagOpenTablerow: 0,
    lavaTagOpenPaginate: 0,
    lavaTagOpenPaginateMarkup: {
      type: ConcreteNodeTypes.PaginateMarkup,
      collection: 0,
      pageSize: 4,
      args: 6,
      locStart,
      locEnd,
      source,
    },
    lavaTagOpenCase: 0,
    lavaTagOpenCaseMarkup: 0,
    lavaTagWhen: 0,
    lavaTagWhenMarkup: 0,
    lavaTagOpenIf: 0,
    lavaTagOpenUnless: 0,
    lavaTagElsif: 0,
    lavaTagElse: 0,
    lavaTagOpenConditionalMarkup: 0,
    condition: {
      type: ConcreteNodeTypes.Condition,
      relation: 0,
      expression: 2,
      locStart,
      locEnd,
      source,
    },
    comparison: {
      type: ConcreteNodeTypes.Comparison,
      comparator: 2,
      left: 0,
      right: 4,
      locStart,
      locEnd,
      source,
    },

    lavaTagClose: {
      type: ConcreteNodeTypes.LavaTagClose,
      name: 4,
      whitespaceStart: 1,
      whitespaceEnd: 7,
      locStart,
      locEnd,
      source,
    },

    lavaTag: 0,
    lavaTagStrict: 0,
    lavaTagBaseCase: 0,
    lavaTagAssign: 0,
    lavaTagEcho: 0,
    lavaTagCycle: 0,
    lavaTagIncrement: 0,
    lavaTagDecrement: 0,
    lavaTagRender: 0,
    lavaTagInclude: 0,
    lavaTagSection: 0,
    lavaTagSections: 0,
    lavaTagLayout: 0,
    lavaTagRule: {
      type: ConcreteNodeTypes.LavaTag,
      name: 3,
      markup(nodes: Node[]) {
        const markupNode = nodes[6];
        const nameNode = nodes[3];
        if (NamedTags.hasOwnProperty(nameNode.sourceString)) {
          return markupNode.toAST((this as any).args.mapping);
        }
        return markupNode.sourceString.trim();
      },
      whitespaceStart: 1,
      whitespaceEnd: 7,
      source,
      locStart,
      locEnd,
    },

    lavaTagLava: 0,
    lavaTagLavaMarkup(tagMarkup: Node) {
      const res = grammars['LavaStatement'].match(
        tagMarkup.sourceString,
        'Node',
      );

      if (res.failed()) {
        throw new LavaHTMLCSTParsingError(res);
      }

      // We're reparsing with a different startIdx
      lavaStatementOffset = tagMarkup.source.startIdx;
      const subCST = toAST(res, {
        ...HelperMappings,
        ...LavaMappings,
        ...LavaStatement,
      });
      lavaStatementOffset = 0;

      return subCST;
    },

    lavaTagEchoMarkup: 0,
    lavaTagSectionMarkup: 0,
    lavaTagSectionsMarkup: 0,
    lavaTagLayoutMarkup: 0,
    lavaTagAssignMarkup: {
      type: ConcreteNodeTypes.AssignMarkup,
      name: 0,
      value: 4,
      locStart,
      locEnd,
      source,
    },

    lavaTagCycleMarkup: {
      type: ConcreteNodeTypes.CycleMarkup,
      groupName: 0,
      args: 3,
      locStart,
      locEnd,
      source,
    },

    lavaTagRenderMarkup: {
      type: ConcreteNodeTypes.RenderMarkup,
      snippet: 0,
      variable: 1,
      alias: 2,
      args: 4,
      locStart,
      locEnd,
      source,
    },
    snippetExpression: 0,
    renderVariableExpression: {
      type: ConcreteNodeTypes.RenderVariableExpression,
      kind: 1,
      name: 3,
      locStart,
      locEnd,
      source,
    },
    renderAliasExpression: 3,

    lavaDrop: {
      type: ConcreteNodeTypes.LavaDrop,
      markup: 3,
      whitespaceStart: 1,
      whitespaceEnd: 4,
      locStart,
      locEnd,
      source,
    },

    lavaDropCases: 0,
    lavaExpression: 0,
    lavaDropBaseCase: (sw: Node) => sw.sourceString.trimEnd(),
    lavaVariable: {
      type: ConcreteNodeTypes.LavaVariable,
      expression: 0,
      filters: 1,
      rawSource: (tokens: Node[]) =>
        source
          .slice(locStart(tokens), tokens[tokens.length - 2].source.endIdx)
          .trimEnd(),
      locStart,
      // The last node of this rule is a positive lookahead, we don't
      // want its endIdx, we want the endIdx of the previous one.
      locEnd: (tokens: Node[]) => tokens[tokens.length - 2].source.endIdx,
      source,
    },

    lavaFilter: {
      type: ConcreteNodeTypes.LavaFilter,
      name: 3,
      locStart,
      locEnd,
      source,
      args(nodes: Node[]) {
        // Traditinally, this would get transformed into null or array. But
        // it's better if we have an empty array instead of null here.
        if (nodes[7].sourceString === '') {
          return [];
        } else {
          return nodes[7].toAST((this as any).args.mapping);
        }
      },
    },
    arguments: 0,
    tagArguments: 0,
    positionalArgument: 0,
    namedArgument: {
      type: ConcreteNodeTypes.NamedArgument,
      name: 0,
      value: 4,
      locStart,
      locEnd,
      source,
    },

    lavaString: 0,
    lavaDoubleQuotedString: {
      type: ConcreteNodeTypes.String,
      single: () => false,
      value: 1,
      locStart,
      locEnd,
      source,
    },
    lavaSingleQuotedString: {
      type: ConcreteNodeTypes.String,
      single: () => true,
      value: 1,
      locStart,
      locEnd,
      source,
    },

    lavaNumber: {
      type: ConcreteNodeTypes.Number,
      value: 0,
      locStart,
      locEnd,
      source,
    },

    lavaLiteral: {
      type: ConcreteNodeTypes.LavaLiteral,
      value: (tokens: Node[]) => {
        const keyword = tokens[0]
          .sourceString as keyof typeof LavaLiteralValues;
        return LavaLiteralValues[keyword];
      },
      keyword: 0,
      locStart,
      locEnd,
      source,
    },

    lavaRange: {
      type: ConcreteNodeTypes.Range,
      start: 2,
      end: 6,
      locStart,
      locEnd,
      source,
    },

    lavaVariableLookup: {
      type: ConcreteNodeTypes.VariableLookup,
      name: 0,
      lookups: 1,
      locStart,
      locEnd,
      source,
    },
    variableSegmentAsLookupMarkup: 0,
    variableSegmentAsLookup: {
      type: ConcreteNodeTypes.VariableLookup,
      name: 0,
      lookups: () => [],
      locStart,
      locEnd,
      source,
    },

    lookup: 0,
    indexLookup: 3,
    dotLookup: {
      type: ConcreteNodeTypes.String,
      value: 3,
      locStart: (nodes: Node[]) => nodes[2].source.startIdx,
      locEnd: (nodes: Node[]) => nodes[nodes.length - 1].source.endIdx,
      source,
    },

    // trim on both sides
    tagMarkup: (n: Node) => n.sourceString.trim(),
  };

  const LavaStatement: Mapping = {
    LavaStatement: 0,
    lavaTagOpenRule: {
      type: ConcreteNodeTypes.LavaTagOpen,
      name: 0,
      markup(nodes: Node[]) {
        const markupNode = nodes[2];
        const nameNode = nodes[0];
        if (NamedTags.hasOwnProperty(nameNode.sourceString)) {
          return markupNode.toAST((this as any).args.mapping);
        }
        return markupNode.sourceString.trim();
      },
      whitespaceStart: null,
      whitespaceEnd: null,
      locStart,
      locEnd: locEndSecondToLast,
      source,
    },

    lavaTagClose: {
      type: ConcreteNodeTypes.LavaTagClose,
      name: 1,
      whitespaceStart: null,
      whitespaceEnd: null,
      locStart,
      locEnd: locEndSecondToLast,
      source,
    },

    lavaTagRule: {
      type: ConcreteNodeTypes.LavaTag,
      name: 0,
      markup(nodes: Node[]) {
        const markupNode = nodes[2];
        const nameNode = nodes[0];
        if (NamedTags.hasOwnProperty(nameNode.sourceString)) {
          return markupNode.toAST((this as any).args.mapping);
        }
        return markupNode.sourceString.trim();
      },
      whitespaceStart: null,
      whitespaceEnd: null,
      locStart,
      locEnd: locEndSecondToLast,
      source,
    },

    lavaRawTagImpl: {
      type: ConcreteNodeTypes.LavaRawTag,
      name: 0,
      body: 4,
      whitespaceStart: null,
      whitespaceEnd: null,
      delimiterWhitespaceStart: null,
      delimiterWhitespaceEnd: null,
      locStart,
      locEnd: locEndSecondToLast,
      source,
      blockStartLocStart: (tokens: Node[]) =>
        lavaStatementOffset + tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: Node[]) =>
        lavaStatementOffset + tokens[2].source.endIdx,
      blockEndLocStart: (tokens: Node[]) =>
        lavaStatementOffset + tokens[5].source.startIdx,
      blockEndLocEnd: (tokens: Node[]) =>
        lavaStatementOffset + tokens[5].source.endIdx,
    },

    lavaBlockComment: {
      type: ConcreteNodeTypes.LavaRawTag,
      name: 'comment',
      body: (tokens: Node[]) =>
        // We want this to behave like LavaRawTag, so we have to do some
        // shenanigans to make it behave the same while also supporting
        // nested comments
        //
        // We're stripping the newline from the statementSep, that's why we
        // slice(1). Since statementSep = newline (space | newline)*
        tokens[1].sourceString.slice(1) + tokens[2].sourceString,
      whitespaceStart: '',
      whitespaceEnd: '',
      delimiterWhitespaceStart: '',
      delimiterWhitespaceEnd: '',
      locStart,
      locEnd,
      source,
      blockStartLocStart: (tokens: Node[]) =>
        lavaStatementOffset + tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: Node[]) =>
        lavaStatementOffset + tokens[0].source.endIdx,
      blockEndLocStart: (tokens: Node[]) =>
        lavaStatementOffset + tokens[4].source.startIdx,
      blockEndLocEnd: (tokens: Node[]) =>
        lavaStatementOffset + tokens[4].source.endIdx,
    },

    lavaInlineComment: {
      type: ConcreteNodeTypes.LavaTag,
      name: 0,
      markup: markupTrimEnd(2),
      whitespaceStart: null,
      whitespaceEnd: null,
      locStart,
      locEnd: locEndSecondToLast,
      source,
    },
  };

  const LavaHTMLMappings: Mapping = {
    Node(frontmatter: Node, nodes: Node) {
      const self = this as any;
      const frontmatterNode =
        frontmatter.sourceString.length === 0
          ? []
          : [frontmatter.toAST(self.args.mapping)];

      return frontmatterNode.concat(nodes.toAST(self.args.mapping));
    },

    yamlFrontmatter: {
      type: ConcreteNodeTypes.YAMLFrontmatter,
      body: 2,
      locStart,
      locEnd,
      source,
    },

    HtmlDoctype: {
      type: ConcreteNodeTypes.HtmlDoctype,
      legacyDoctypeString: 4,
      locStart,
      locEnd,
      source,
    },

    HtmlComment: {
      type: ConcreteNodeTypes.HtmlComment,
      body: markup(1),
      locStart,
      locEnd,
      source,
    },

    HtmlRawTagImpl: {
      type: ConcreteNodeTypes.HtmlRawTag,
      name: (tokens: Node[]) => tokens[0].children[1].sourceString,
      attrList(tokens: Node[]) {
        const mappings = (this as any).args.mapping;
        return tokens[0].children[2].toAST(mappings);
      },
      body: (tokens: Node[]) =>
        source.slice(tokens[0].source.endIdx, tokens[2].source.startIdx),
      locStart,
      locEnd,
      source,
      blockStartLocStart: (tokens: any) => tokens[0].source.startIdx,
      blockStartLocEnd: (tokens: any) => tokens[0].source.endIdx,
      blockEndLocStart: (tokens: any) => tokens[2].source.startIdx,
      blockEndLocEnd: (tokens: any) => tokens[2].source.endIdx,
    },

    HtmlVoidElement: {
      type: ConcreteNodeTypes.HtmlVoidElement,
      name: 1,
      attrList: 3,
      locStart,
      locEnd,
      source,
    },

    HtmlSelfClosingElement: {
      type: ConcreteNodeTypes.HtmlSelfClosingElement,
      name: 1,
      attrList: 2,
      locStart,
      locEnd,
      source,
    },

    HtmlTagOpen: {
      type: ConcreteNodeTypes.HtmlTagOpen,
      name: 1,
      attrList: 2,
      locStart,
      locEnd,
      source,
    },

    HtmlTagClose: {
      type: ConcreteNodeTypes.HtmlTagClose,
      name: 1,
      locStart,
      locEnd,
      source,
    },

    leadingTagNamePart: 0,
    leadingTagNameTextNode: textNode,
    trailingTagNamePart: 0,
    trailingTagNameTextNode: textNode,
    tagName(leadingPart: Node, trailingParts: Node) {
      const mappings = (this as any).args.mapping;
      return [leadingPart.toAST(mappings)].concat(
        trailingParts.toAST(mappings),
      );
    },

    AttrUnquoted: {
      type: ConcreteNodeTypes.AttrUnquoted,
      name: 0,
      value: 2,
      locStart,
      locEnd,
      source,
    },

    AttrSingleQuoted: {
      type: ConcreteNodeTypes.AttrSingleQuoted,
      name: 0,
      value: 3,
      locStart,
      locEnd,
      source,
    },

    AttrDoubleQuoted: {
      type: ConcreteNodeTypes.AttrDoubleQuoted,
      name: 0,
      value: 3,
      locStart,
      locEnd,
      source,
    },

    attrEmpty: {
      type: ConcreteNodeTypes.AttrEmpty,
      name: 0,
      locStart,
      locEnd,
      source,
    },

    attrName: 0,
    attrNameTextNode: textNode,
    attrDoubleQuotedValue: 0,
    attrSingleQuotedValue: 0,
    attrUnquotedValue: 0,
    attrDoubleQuotedTextNode: textNode,
    attrSingleQuotedTextNode: textNode,
    attrUnquotedTextNode: textNode,
  };

  const defaultMappings = {
    HelperMappings,
    LavaMappings,
    LavaHTMLMappings,
  };

  const selectedMappings = cstMappings.reduce(
    (mappings, key) => ({
      ...mappings,
      ...defaultMappings[key],
    }),
    {},
  );

  return toAST(res, selectedMappings) as T;
}
