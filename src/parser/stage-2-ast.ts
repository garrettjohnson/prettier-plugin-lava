/**
 * This is the second stage of the parser.
 *
 * Input:
 *  - A Concrete Syntax Tree (CST)
 *
 * Output:
 *  - An Abstract Syntax Tree (AST)
 *
 * This stage traverses the flat tree we get from the previous stage and
 * establishes the parent/child relationship between the nodes.
 *
 * Recall the Lava example we had in the first stage:
 *   {% if cond %}hi <em>there!</em>{% endif %}
 *
 * Whereas the previous stage gives us this CST:
 *   - LavaTagOpen/if
 *     condition: LavaVariableExpression/cond
 *   - TextNode/"hi "
 *   - HtmlTagOpen/em
 *   - TextNode/"there!"
 *   - HtmlTagClose/em
 *   - LavaTagClose/if
 *
 * We now traverse all the nodes and turn that into a proper AST:
 *   - LavaTag/if
 *     condition: LavaVariableExpression
 *     children:
 *       - TextNode/"hi "
 *       - HtmlElement/em
 *         children:
 *           - TextNode/"there!"
 *
 */

import {
  ConcreteAttributeNode,
  ConcreteHtmlTagClose,
  ConcreteHtmlTagOpen,
  ConcreteHtmlVoidElement,
  ConcreteLavaDrop,
  ConcreteLavaNode,
  ConcreteLavaTagClose,
  ConcreteNodeTypes,
  ConcreteTextNode,
  LavaCST,
  LavaHtmlCST,
  toLavaHtmlCST,
  ConcreteHtmlSelfClosingElement,
  ConcreteAttrSingleQuoted,
  ConcreteAttrDoubleQuoted,
  ConcreteAttrUnquoted,
  ConcreteLavaVariable,
  ConcreteLavaLiteral,
  ConcreteLavaFilter,
  ConcreteLavaExpression,
  ConcreteLavaNamedArgument,
  ConcreteLavaTagNamed,
  ConcreteLavaTag,
  ConcreteLavaTagAssignMarkup,
  ConcreteLavaTagRenderMarkup,
  ConcreteRenderVariableExpression,
  ConcreteLavaTagOpenNamed,
  ConcreteLavaTagOpen,
  ConcreteLavaArgument,
  ConcretePaginateMarkup,
  ConcreteLavaCondition,
  ConcreteLavaComparison,
  ConcreteLavaTagForMarkup,
  ConcreteLavaTagCycleMarkup,
  ConcreteHtmlRawTag,
  ConcreteLavaRawTag,
  LavaHtmlConcreteNode,
} from '~/parser/stage-1-cst';
import {
  Comparators,
  isLavaHtmlNode,
  NamedTags,
  NodeTypes,
  nonTraversableProperties,
  Position,
} from '~/types';
import { assertNever, deepGet, dropLast } from '~/utils';
import { LavaHTMLASTParsingError } from '~/parser/errors';
import { TAGS_WITHOUT_MARKUP } from '~/parser/grammar';
import { toLavaCST } from '~/parser/stage-1-cst';

interface HasPosition {
  locStart: number;
  locEnd: number;
}

export type LavaHtmlNode =
  | DocumentNode
  | YAMLFrontmatter
  | LavaNode
  | HtmlDoctype
  | HtmlNode
  | AttributeNode
  | LavaVariable
  | LavaExpression
  | LavaFilter
  | LavaNamedArgument
  | AssignMarkup
  | CycleMarkup
  | ForMarkup
  | RenderMarkup
  | PaginateMarkup
  | RawMarkup
  | RenderVariableExpression
  | LavaLogicalExpression
  | LavaComparison
  | TextNode;

export type LavaAST =
  | DocumentNode
  | LavaNode
  | LavaVariable
  | LavaExpression
  | LavaFilter
  | LavaNamedArgument
  | AssignMarkup
  | CycleMarkup
  | ForMarkup
  | RenderMarkup
  | PaginateMarkup
  | RawMarkup
  | RenderVariableExpression
  | LavaLogicalExpression
  | LavaComparison
  | TextNode;

export interface DocumentNode extends ASTNode<NodeTypes.Document> {
  children: LavaHtmlNode[];
  name: '#document';
}

export interface YAMLFrontmatter extends ASTNode<NodeTypes.YAMLFrontmatter> {
  body: string;
}

export type LavaNode = LavaRawTag | LavaTag | LavaDrop | LavaBranch;
export type LavaStatement = LavaRawTag | LavaTag | LavaBranch;

export interface HasChildren {
  children?: LavaHtmlNode[];
}
export interface HasAttributes {
  attributes: AttributeNode[];
}
export interface HasValue {
  value: (TextNode | LavaNode)[];
}
export interface HasName {
  name: string | LavaDrop;
}
export interface HasCompoundName {
  name: (TextNode | LavaNode)[];
}

export type ParentNode = Extract<
  LavaHtmlNode,
  HasChildren | HasAttributes | HasValue | HasName | HasCompoundName
>;

export interface LavaRawTag extends ASTNode<NodeTypes.LavaRawTag> {
  /**
   * e.g. raw, style, javascript
   */
  name: string;
  markup: string;

  /**
   * String body of the tag. So we don't try to parse it.
   */
  body: RawMarkup;
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  delimiterWhitespaceStart: '-' | '';
  delimiterWhitespaceEnd: '-' | '';
  blockStartPosition: Position;
  blockEndPosition: Position;
}

export type LavaTag = LavaTagNamed | LavaTagBaseCase;
export type LavaTagNamed =
  | LavaTagAssign
  | LavaTagCase
  | LavaTagCapture
  | LavaTagCycle
  | LavaTagDecrement
  | LavaTagEcho
  | LavaTagFor
  | LavaTagForm
  | LavaTagIf
  | LavaTagInclude
  | LavaTagIncrement
  | LavaTagLayout
  | LavaTagLava
  | LavaTagPaginate
  | LavaTagRender
  | LavaTagSection
  | LavaTagSections
  | LavaTagTablerow
  | LavaTagUnless;

export interface LavaTagNode<Name, Markup> extends ASTNode<NodeTypes.LavaTag> {
  /**
   * e.g. if, ifchanged, for, etc.
   */
  name: Name;

  /**
   * The body of the tag. May contain arguments. Excludes the name of the tag. Left trimmed if string.
   */
  markup: Markup;
  children?: LavaHtmlNode[];
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  delimiterWhitespaceStart?: '-' | '';
  delimiterWhitespaceEnd?: '-' | '';
  blockStartPosition: Position;
  blockEndPosition?: Position;
}

export interface LavaTagBaseCase extends LavaTagNode<string, string> {}
export interface LavaTagEcho
  extends LavaTagNode<NamedTags.echo, LavaVariable> {}

export interface LavaTagAssign
  extends LavaTagNode<NamedTags.assign, AssignMarkup> {}
export interface AssignMarkup extends ASTNode<NodeTypes.AssignMarkup> {
  name: string;
  value: LavaVariable;
}

export interface LavaTagIncrement
  extends LavaTagNode<NamedTags.increment, LavaVariableLookup> {}
export interface LavaTagDecrement
  extends LavaTagNode<NamedTags.decrement, LavaVariableLookup> {}

export interface LavaTagCapture
  extends LavaTagNode<NamedTags.capture, LavaVariableLookup> {}

export interface LavaTagCycle
  extends LavaTagNode<NamedTags.cycle, CycleMarkup> {}
export interface CycleMarkup extends ASTNode<NodeTypes.CycleMarkup> {
  groupName: LavaExpression | null;
  args: LavaExpression[];
}

export interface LavaTagCase
  extends LavaTagNode<NamedTags.case, LavaExpression> {}
export interface LavaBranchWhen
  extends LavaBranchNode<NamedTags.when, LavaExpression[]> {}

export interface LavaTagForm
  extends LavaTagNode<NamedTags.form, LavaArgument[]> {}

export interface LavaTagFor extends LavaTagNode<NamedTags.for, ForMarkup> {}
export interface ForMarkup extends ASTNode<NodeTypes.ForMarkup> {
  variableName: string;
  collection: LavaExpression;
  reversed: boolean;
  args: LavaNamedArgument[];
}

export interface LavaTagTablerow
  extends LavaTagNode<NamedTags.tablerow, ForMarkup> {}

export interface LavaTagIf extends LavaTagConditional<NamedTags.if> {}
export interface LavaTagUnless extends LavaTagConditional<NamedTags.unless> {}
export interface LavaBranchElseif
  extends LavaBranchNode<NamedTags.elseif, LavaConditionalExpression> {}
export interface LavaTagConditional<Name>
  extends LavaTagNode<Name, LavaConditionalExpression> {}

export type LavaConditionalExpression =
  | LavaLogicalExpression
  | LavaComparison
  | LavaExpression;

export interface LavaLogicalExpression
  extends ASTNode<NodeTypes.LogicalExpression> {
  relation: 'and' | 'or';
  left: LavaConditionalExpression;
  right: LavaConditionalExpression;
}

export interface LavaComparison extends ASTNode<NodeTypes.Comparison> {
  comparator: Comparators;
  left: LavaConditionalExpression;
  right: LavaConditionalExpression;
}

export interface LavaTagPaginate
  extends LavaTagNode<NamedTags.paginate, PaginateMarkup> {}
export interface PaginateMarkup extends ASTNode<NodeTypes.PaginateMarkup> {
  collection: LavaExpression;
  pageSize: LavaExpression;
  args: LavaNamedArgument[];
}

export interface LavaTagRender
  extends LavaTagNode<NamedTags.render, RenderMarkup> {}
export interface LavaTagInclude
  extends LavaTagNode<NamedTags.include, RenderMarkup> {}

export interface LavaTagSection
  extends LavaTagNode<NamedTags.section, LavaString> {}
export interface LavaTagSections
  extends LavaTagNode<NamedTags.sections, LavaString> {}
export interface LavaTagLayout
  extends LavaTagNode<NamedTags.layout, LavaExpression> {}

export interface LavaTagLava
  extends LavaTagNode<NamedTags.lava, LavaStatement[]> {}

export interface RenderMarkup extends ASTNode<NodeTypes.RenderMarkup> {
  snippet: LavaString | LavaVariableLookup;
  alias: string | null;
  variable: RenderVariableExpression | null;
  args: LavaNamedArgument[];
}

export interface RenderVariableExpression
  extends ASTNode<NodeTypes.RenderVariableExpression> {
  kind: 'for' | 'with';
  name: LavaExpression;
}

export type LavaBranch =
  | LavaBranchUnnamed
  | LavaBranchBaseCase
  | LavaBranchNamed;
export type LavaBranchNamed = LavaBranchElseif | LavaBranchWhen;

interface LavaBranchNode<Name, Markup> extends ASTNode<NodeTypes.LavaBranch> {
  /**
   * e.g. else, elseif, when | null when in the main branch
   */
  name: Name;

  /**
   * The body of the branch tag. May contain arguments. Excludes the name of the tag. Left trimmed.
   */
  markup: Markup;
  children: LavaHtmlNode[];
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  blockStartPosition: Position;
}

export interface LavaBranchUnnamed extends LavaBranchNode<null, string> {}
export interface LavaBranchBaseCase extends LavaBranchNode<string, string> {}

export interface LavaDrop extends ASTNode<NodeTypes.LavaDrop> {
  /**
   * The body of the drop. May contain filters. Not trimmed.
   */
  markup: string | LavaVariable;
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
}

interface LavaVariable extends ASTNode<NodeTypes.LavaVariable> {
  expression: LavaExpression;
  filters: LavaFilter[];
  rawSource: string;
}

export type LavaExpression =
  | LavaString
  | LavaNumber
  | LavaLiteral
  | LavaRange
  | LavaVariableLookup;

interface LavaFilter extends ASTNode<NodeTypes.LavaFilter> {
  name: string;
  args: LavaArgument[];
}

type LavaArgument = LavaExpression | LavaNamedArgument;

interface LavaNamedArgument extends ASTNode<NodeTypes.NamedArgument> {
  name: string;
  value: LavaExpression;
}

interface LavaString extends ASTNode<NodeTypes.String> {
  single: boolean;
  value: string;
}

interface LavaNumber extends ASTNode<NodeTypes.Number> {
  value: string;
}

interface LavaRange extends ASTNode<NodeTypes.Range> {
  start: LavaExpression;
  end: LavaExpression;
}

interface LavaLiteral extends ASTNode<NodeTypes.LavaLiteral> {
  keyword: ConcreteLavaLiteral['keyword'];
  value: ConcreteLavaLiteral['value'];
}

interface LavaVariableLookup extends ASTNode<NodeTypes.VariableLookup> {
  name: string | null;
  lookups: LavaExpression[];
}

export type HtmlNode =
  | HtmlComment
  | HtmlElement
  | HtmlDanglingMarkerOpen
  | HtmlDanglingMarkerClose
  | HtmlVoidElement
  | HtmlSelfClosingElement
  | HtmlRawNode;

export interface HtmlElement extends HtmlNodeBase<NodeTypes.HtmlElement> {
  /**
   * The name of the tag can be compound
   * @example <{{ header_type }}--header />
   */
  name: (TextNode | LavaDrop)[];
  children: LavaHtmlNode[];
  blockEndPosition: Position;
}

export interface HtmlDanglingMarkerOpen
  extends HtmlNodeBase<NodeTypes.HtmlDanglingMarkerOpen> {
  name: (TextNode | LavaDrop)[];
}

export interface HtmlDanglingMarkerClose
  extends ASTNode<NodeTypes.HtmlDanglingMarkerClose> {
  name: (TextNode | LavaDrop)[];
  blockStartPosition: Position;
}

export interface HtmlSelfClosingElement
  extends HtmlNodeBase<NodeTypes.HtmlSelfClosingElement> {
  /**
   * The name of the tag can be compound
   * @example <{{ header_type }}--header />
   */
  name: (TextNode | LavaDrop)[];
}

export interface HtmlVoidElement
  extends HtmlNodeBase<NodeTypes.HtmlVoidElement> {
  name: string;
}

export interface HtmlRawNode extends HtmlNodeBase<NodeTypes.HtmlRawNode> {
  /**
   * The innerHTML of the tag as a string. Not trimmed. Not parsed.
   */
  body: RawMarkup;
  name: string;
  blockEndPosition: Position;
}

export enum RawMarkupKinds {
  css = 'css',
  html = 'html',
  javascript = 'javascript',
  json = 'json',
  markdown = 'markdown',
  typescript = 'typescript',
  text = 'text',
}

export interface RawMarkup extends ASTNode<NodeTypes.RawMarkup> {
  kind: RawMarkupKinds;
  value: string;
}

export interface HtmlDoctype extends ASTNode<NodeTypes.HtmlDoctype> {
  legacyDoctypeString: string | null;
}

export interface HtmlComment extends ASTNode<NodeTypes.HtmlComment> {
  body: string;
}

export interface HtmlNodeBase<T> extends ASTNode<T> {
  attributes: AttributeNode[];
  blockStartPosition: Position;
}

export type AttributeNode =
  | LavaNode
  | AttrSingleQuoted
  | AttrDoubleQuoted
  | AttrUnquoted
  | AttrEmpty;

export interface AttrSingleQuoted
  extends AttributeNodeBase<NodeTypes.AttrSingleQuoted> {}
export interface AttrDoubleQuoted
  extends AttributeNodeBase<NodeTypes.AttrDoubleQuoted> {}
export interface AttrUnquoted
  extends AttributeNodeBase<NodeTypes.AttrUnquoted> {}
export interface AttrEmpty extends ASTNode<NodeTypes.AttrEmpty> {
  name: (TextNode | LavaDrop)[];
}

export type ValueNode = TextNode | LavaNode;

export interface AttributeNodeBase<T> extends ASTNode<T> {
  name: (TextNode | LavaDrop)[];
  value: ValueNode[];
  attributePosition: Position;
}

export interface TextNode extends ASTNode<NodeTypes.TextNode> {
  value: string;
}

export interface ASTNode<T> {
  type: T;
  position: Position;
  source: string;
}

interface ASTBuildOptions {
  /**
   * Whether the parser should throw if the document node isn't closed
   */
  allowUnclosedDocumentNode: boolean;

  /**
   * 'strict' will disable the Lava parsing base cases. Which means that we will
   * throw an error if we can't parse the node `markup` properly.
   *
   * 'tolerant' is the default case so that prettier can pretty print nodes
   * that it doesn't understand.
   */
  mode: 'strict' | 'tolerant' | 'completion';
}

export function isBranchedTag(node: LavaHtmlNode) {
  return (
    node.type === NodeTypes.LavaTag &&
    ['if', 'for', 'unless', 'case'].includes(node.name)
  );
}

// Not exported because you can use node.type === NodeTypes.LavaBranch.
function isLavaBranchDisguisedAsTag(
  node: LavaHtmlNode,
): node is LavaTagBaseCase {
  return (
    node.type === NodeTypes.LavaTag &&
    ['else', 'elseif', 'when'].includes(node.name)
  );
}

function isConcreteLavaBranchDisguisedAsTag(
  node: LavaHtmlConcreteNode,
): node is ConcreteLavaNode & { name: 'else' | 'eslif' | 'when' } {
  return (
    node.type === ConcreteNodeTypes.LavaTag &&
    ['else', 'eslif', 'when'].includes(node.name)
  );
}

export function toLavaAST(
  source: string,
  options: ASTBuildOptions = {
    allowUnclosedDocumentNode: true,
    mode: 'tolerant',
  },
) {
  const cst = toLavaCST(source, { mode: options.mode });
  const root: DocumentNode = {
    type: NodeTypes.Document,
    source: source,
    children: cstToAst(cst, options),
    name: '#document',
    position: {
      start: 0,
      end: source.length,
    },
  };
  return root;
}

export function toLavaHtmlAST(
  source: string,
  options: ASTBuildOptions = {
    allowUnclosedDocumentNode: false,
    mode: 'tolerant',
  },
): DocumentNode {
  const cst = toLavaHtmlCST(source, { mode: options.mode });
  const root: DocumentNode = {
    type: NodeTypes.Document,
    source: source,
    children: cstToAst(cst, options),
    name: '#document',
    position: {
      start: 0,
      end: source.length,
    },
  };
  return root;
}

class ASTBuilder {
  ast: LavaHtmlNode[];
  cursor: (string | number)[];
  source: string;

  constructor(source: string) {
    this.ast = [];
    this.cursor = [];
    this.source = source;
  }

  get current() {
    return deepGet<LavaHtmlNode[]>(this.cursor, this.ast) as LavaHtmlNode[];
  }

  get currentPosition(): number {
    return (this.current || []).length - 1;
  }

  get parent(): ParentNode | undefined {
    if (this.cursor.length == 0) return undefined;
    return deepGet<LavaTag | HtmlElement>(dropLast(1, this.cursor), this.ast);
  }

  get grandparent(): ParentNode | undefined {
    if (this.cursor.length < 4) return undefined;
    return deepGet<LavaTag | HtmlElement>(dropLast(3, this.cursor), this.ast);
  }

  open(node: LavaHtmlNode) {
    this.current.push(node);
    this.cursor.push(this.currentPosition);
    this.cursor.push('children');

    if (isBranchedTag(node)) {
      this.open(toUnnamedLavaBranch(node));
    }
  }

  push(node: LavaHtmlNode) {
    if (node.type === NodeTypes.LavaTag && isLavaBranchDisguisedAsTag(node)) {
      this.cursor.pop();
      this.cursor.pop();
      this.open(toNamedLavaBranchBaseCase(node));
    } else if (node.type === NodeTypes.LavaBranch) {
      this.cursor.pop();
      this.cursor.pop();
      this.open(node);
    } else {
      if (this.parent?.type === NodeTypes.LavaBranch) {
        this.parent.position.end = node.position.end;
      }
      this.current.push(node);
    }
  }

  close(
    node: ConcreteLavaTagClose | ConcreteHtmlTagClose,
    nodeType: NodeTypes.LavaTag | NodeTypes.HtmlElement,
  ) {
    if (isLavaBranch(this.parent)) {
      this.parent.position.end = node.locStart;
      this.cursor.pop();
      this.cursor.pop();
    }

    if (!this.parent) {
      throw new LavaHTMLASTParsingError(
        `Attempting to close ${nodeType} '${getName(
          node,
        )}' before it was opened`,
        this.source,
        node.locStart,
        node.locEnd,
      );
    }

    if (
      getName(this.parent) !== getName(node) ||
      this.parent.type !== nodeType
    ) {
      throw new LavaHTMLASTParsingError(
        `Attempting to close ${nodeType} '${getName(node)}' before ${
          this.parent.type
        } '${getName(this.parent)}' was closed`,
        this.source,
        this.parent.position.start,
        node.locEnd,
      );
    }

    // The parent end is the end of the outer tag.
    this.parent.position.end = node.locEnd;
    this.parent.blockEndPosition = position(node);
    if (
      this.parent.type == NodeTypes.LavaTag &&
      node.type == ConcreteNodeTypes.LavaTagClose
    ) {
      this.parent.delimiterWhitespaceStart = node.whitespaceStart ?? '';
      this.parent.delimiterWhitespaceEnd = node.whitespaceEnd ?? '';
    }
    this.cursor.pop();
    this.cursor.pop();
  }
}

function isLavaBranch(
  node: LavaHtmlNode | undefined,
): node is LavaBranchNode<any, any> {
  return !!node && node.type === NodeTypes.LavaBranch;
}

function getName(
  node: ConcreteLavaTagClose | ConcreteHtmlTagClose | ParentNode | undefined,
): string | LavaDrop | null {
  if (!node) return null;
  switch (node.type) {
    case NodeTypes.HtmlElement:
    case NodeTypes.HtmlDanglingMarkerOpen:
    case NodeTypes.HtmlDanglingMarkerClose:
    case NodeTypes.HtmlSelfClosingElement:
    case ConcreteNodeTypes.HtmlTagClose:
      return node.name
        .map((part) => {
          if (
            part.type === NodeTypes.TextNode ||
            part.type == ConcreteNodeTypes.TextNode
          ) {
            return part.value;
          } else if (typeof part.markup === 'string') {
            return `{{${part.markup.trim()}}}`;
          } else {
            return `{{${part.markup.rawSource}}}`;
          }
        })
        .join('');
    case NodeTypes.AttrEmpty:
    case NodeTypes.AttrUnquoted:
    case NodeTypes.AttrDoubleQuoted:
    case NodeTypes.AttrSingleQuoted:
      // <a href="{{ hello }}">
      return node.name
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          } else {
            return part.source.slice(part.position.start, part.position.end);
          }
        })
        .join('');
    default:
      return node.name;
  }
}

export function cstToAst(
  cst: LavaHtmlCST | LavaCST | ConcreteAttributeNode[],
  options: ASTBuildOptions,
): LavaHtmlNode[] {
  if (cst.length === 0) return [];

  const builder = buildAst(cst, options);

  if (!options.allowUnclosedDocumentNode && builder.cursor.length !== 0) {
    throw new LavaHTMLASTParsingError(
      `Attempting to end parsing before ${builder.parent?.type} '${getName(
        builder.parent,
      )}' was closed`,
      builder.source,
      builder.source.length - 1,
      builder.source.length,
    );
  }

  return builder.ast;
}

function buildAst(
  cst: LavaHtmlCST | LavaCST | ConcreteAttributeNode[],
  options: ASTBuildOptions,
) {
  const builder = new ASTBuilder(cst[0].source);

  for (let i = 0; i < cst.length; i++) {
    const node = cst[i];

    switch (node.type) {
      case ConcreteNodeTypes.TextNode: {
        builder.push(toTextNode(node));
        break;
      }

      case ConcreteNodeTypes.LavaDrop: {
        builder.push(toLavaDrop(node));
        break;
      }

      case ConcreteNodeTypes.LavaTagOpen: {
        builder.open(toLavaTag(node, { isBlockTag: true, ...options }));
        break;
      }

      case ConcreteNodeTypes.LavaTagClose: {
        builder.close(node, NodeTypes.LavaTag);
        break;
      }

      case ConcreteNodeTypes.LavaTag: {
        builder.push(toLavaTag(node, { isBlockTag: false, ...options }));
        break;
      }

      case ConcreteNodeTypes.LavaRawTag: {
        builder.push({
          type: NodeTypes.LavaRawTag,
          markup: markup(node.name, node.markup),
          name: node.name,
          body: toRawMarkup(node),
          whitespaceStart: node.whitespaceStart ?? '',
          whitespaceEnd: node.whitespaceEnd ?? '',
          delimiterWhitespaceStart: node.delimiterWhitespaceStart ?? '',
          delimiterWhitespaceEnd: node.delimiterWhitespaceEnd ?? '',
          position: position(node),
          blockStartPosition: {
            start: node.blockStartLocStart,
            end: node.blockStartLocEnd,
          },
          blockEndPosition: {
            start: node.blockEndLocStart,
            end: node.blockEndLocEnd,
          },
          source: node.source,
        });
        break;
      }

      case ConcreteNodeTypes.HtmlTagOpen: {
        if (isAcceptableDanglingMarkerOpen(builder, cst as LavaHtmlCST, i)) {
          builder.push(toHtmlDanglingMarkerOpen(node, options));
        } else {
          builder.open(toHtmlElement(node, options));
        }
        break;
      }

      case ConcreteNodeTypes.HtmlTagClose: {
        if (isAcceptableDanglingMarkerClose(builder, cst as LavaHtmlCST, i)) {
          builder.push(toHtmlDanglingMarkerClose(node, options));
        } else {
          builder.close(node, NodeTypes.HtmlElement);
        }
        break;
      }

      case ConcreteNodeTypes.HtmlVoidElement: {
        builder.push(toHtmlVoidElement(node, options));
        break;
      }

      case ConcreteNodeTypes.HtmlSelfClosingElement: {
        builder.push(toHtmlSelfClosingElement(node, options));
        break;
      }

      case ConcreteNodeTypes.HtmlDoctype: {
        builder.push({
          type: NodeTypes.HtmlDoctype,
          legacyDoctypeString: node.legacyDoctypeString,
          position: position(node),
          source: node.source,
        });
        break;
      }

      case ConcreteNodeTypes.HtmlComment: {
        builder.push({
          type: NodeTypes.HtmlComment,
          body: node.body,
          position: position(node),
          source: node.source,
        });
        break;
      }

      case ConcreteNodeTypes.HtmlRawTag: {
        builder.push({
          type: NodeTypes.HtmlRawNode,
          name: node.name,
          body: toRawMarkup(node),
          attributes: toAttributes(node.attrList || [], options),
          position: position(node),
          source: node.source,
          blockStartPosition: {
            start: node.blockStartLocStart,
            end: node.blockStartLocEnd,
          },
          blockEndPosition: {
            start: node.blockEndLocStart,
            end: node.blockEndLocEnd,
          },
        });
        break;
      }

      case ConcreteNodeTypes.AttrEmpty: {
        builder.push({
          type: NodeTypes.AttrEmpty,
          name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
          position: position(node),
          source: node.source,
        });
        break;
      }

      case ConcreteNodeTypes.AttrSingleQuoted:
      case ConcreteNodeTypes.AttrDoubleQuoted:
      case ConcreteNodeTypes.AttrUnquoted: {
        const abstractNode: AttrUnquoted | AttrSingleQuoted | AttrDoubleQuoted =
          {
            type: node.type as unknown as
              | NodeTypes.AttrSingleQuoted
              | NodeTypes.AttrDoubleQuoted
              | NodeTypes.AttrUnquoted,
            name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
            position: position(node),
            source: node.source,

            // placeholders
            attributePosition: { start: -1, end: -1 },
            value: [],
          };
        const value = toAttributeValue(node.value, options);
        abstractNode.value = value;
        abstractNode.attributePosition = toAttributePosition(node, value);
        builder.push(abstractNode);
        break;
      }

      case ConcreteNodeTypes.YAMLFrontmatter: {
        builder.push({
          type: NodeTypes.YAMLFrontmatter,
          body: node.body,
          position: position(node),
          source: node.source,
        });
        break;
      }

      default: {
        assertNever(node);
      }
    }
  }

  return builder;
}

function nameLength(names: (ConcreteLavaDrop | ConcreteTextNode)[]) {
  const start = names.at(0)!;
  const end = names.at(-1)!;
  return end.locEnd - start.locStart;
}

function toAttributePosition(
  node:
    | ConcreteAttrSingleQuoted
    | ConcreteAttrDoubleQuoted
    | ConcreteAttrUnquoted,
  value: (LavaNode | TextNode)[],
): Position {
  if (value.length === 0) {
    // This is bugged when there's whitespace on either side. But I don't
    // think it's worth solving.
    return {
      start: node.locStart + nameLength(node.name) + '='.length + '"'.length,
      // name=""
      // 012345678
      // 0 + 4 + 1 + 1
      // = 6
      end: node.locStart + nameLength(node.name) + '='.length + '"'.length,
      // name=""
      // 012345678
      // 0 + 4 + 1 + 2
      // = 6
    };
  }

  return {
    start: value[0].position.start,
    end: value[value.length - 1].position.end,
  };
}

function toAttributeValue(
  value: (ConcreteLavaNode | ConcreteTextNode)[],
  options: ASTBuildOptions,
): (LavaNode | TextNode)[] {
  return cstToAst(value, options) as (LavaNode | TextNode)[];
}

function toAttributes(
  attrList: ConcreteAttributeNode[],
  options: ASTBuildOptions,
): AttributeNode[] {
  return cstToAst(attrList, options) as AttributeNode[];
}

function lavaTagBaseAttributes(
  node: ConcreteLavaTag | ConcreteLavaTagOpen,
): Omit<LavaTag, 'name' | 'markup'> {
  return {
    type: NodeTypes.LavaTag,
    position: position(node),
    whitespaceStart: node.whitespaceStart ?? '',
    whitespaceEnd: node.whitespaceEnd ?? '',
    blockStartPosition: position(node),
    source: node.source,
  };
}

function lavaBranchBaseAttributes(
  node: ConcreteLavaTag,
): Omit<LavaBranch, 'name' | 'markup'> {
  return {
    type: NodeTypes.LavaBranch,
    children: [],
    position: position(node),
    whitespaceStart: node.whitespaceStart ?? '',
    whitespaceEnd: node.whitespaceEnd ?? '',
    blockStartPosition: position(node),
    source: node.source,
  };
}

function toLavaTag(
  node: ConcreteLavaTag | ConcreteLavaTagOpen,
  options: ASTBuildOptions & { isBlockTag: boolean },
): LavaTag | LavaBranch {
  if (typeof node.markup !== 'string') {
    return toNamedLavaTag(node as ConcreteLavaTagNamed, options);
  } else if (options.isBlockTag) {
    return {
      name: node.name,
      markup: markup(node.name, node.markup),
      children: options.isBlockTag ? [] : undefined,
      ...lavaTagBaseAttributes(node),
    };
  }
  return {
    name: node.name,
    markup: markup(node.name, node.markup),
    ...lavaTagBaseAttributes(node),
  };
}

function toNamedLavaTag(
  node: ConcreteLavaTagNamed | ConcreteLavaTagOpenNamed,
  options: ASTBuildOptions,
): LavaTagNamed | LavaBranchNamed {
  switch (node.name) {
    case NamedTags.echo: {
      return {
        ...lavaTagBaseAttributes(node),
        name: NamedTags.echo,
        markup: toLavaVariable(node.markup),
      };
    }

    case NamedTags.assign: {
      return {
        ...lavaTagBaseAttributes(node),
        name: NamedTags.assign,
        markup: toAssignMarkup(node.markup),
      };
    }

    case NamedTags.cycle: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toCycleMarkup(node.markup),
      };
    }

    case NamedTags.increment:
    case NamedTags.decrement: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toExpression(node.markup) as LavaVariableLookup,
      };
    }

    case NamedTags.capture: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toExpression(node.markup) as LavaVariableLookup,
        children: [],
      };
    }

    case NamedTags.include:
    case NamedTags.render: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toRenderMarkup(node.markup),
      };
    }

    case NamedTags.layout:
    case NamedTags.section: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toExpression(node.markup) as LavaString,
      };
    }
    case NamedTags.sections: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toExpression(node.markup) as LavaString,
      };
    }

    case NamedTags.form: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: node.markup.map(toLavaArgument),
        children: [],
      };
    }

    case NamedTags.tablerow:
    case NamedTags.for: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toForMarkup(node.markup),
        children: [],
      };
    }

    case NamedTags.paginate: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toPaginateMarkup(node.markup),
        children: [],
      };
    }

    case NamedTags.if:
    case NamedTags.unless: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toConditionalExpression(node.markup),
        children: [],
      };
    }

    case NamedTags.elseif: {
      return {
        ...lavaBranchBaseAttributes(node),
        name: node.name,
        markup: toConditionalExpression(node.markup),
      };
    }

    case NamedTags.case: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: toExpression(node.markup),
        children: [],
      };
    }

    case NamedTags.when: {
      return {
        ...lavaBranchBaseAttributes(node),
        name: node.name,
        markup: node.markup.map(toExpression),
      };
    }

    case NamedTags.lava: {
      return {
        ...lavaTagBaseAttributes(node),
        name: node.name,
        markup: cstToAst(node.markup, options) as LavaStatement[],
      };
    }

    default: {
      return assertNever(node);
    }
  }
}

function toNamedLavaBranchBaseCase(node: LavaTagBaseCase): LavaBranchBaseCase {
  return {
    name: node.name,
    type: NodeTypes.LavaBranch,
    markup: node.markup,
    position: { ...node.position },
    children: [],
    blockStartPosition: { ...node.position },
    whitespaceStart: node.whitespaceStart,
    whitespaceEnd: node.whitespaceEnd,
    source: node.source,
  };
}

function toUnnamedLavaBranch(parentNode: LavaHtmlNode): LavaBranchUnnamed {
  return {
    type: NodeTypes.LavaBranch,
    name: null,
    markup: '',
    position: {
      start: parentNode.position.end,
      end: parentNode.position.end, // tmp value
    },
    blockStartPosition: {
      start: parentNode.position.end,
      end: parentNode.position.end,
    },
    children: [],
    whitespaceStart: '',
    whitespaceEnd: '',
    source: parentNode.source,
  };
}

function toAssignMarkup(node: ConcreteLavaTagAssignMarkup): AssignMarkup {
  return {
    type: NodeTypes.AssignMarkup,
    name: node.name,
    value: toLavaVariable(node.value),
    position: position(node),
    source: node.source,
  };
}

function toCycleMarkup(node: ConcreteLavaTagCycleMarkup): CycleMarkup {
  return {
    type: NodeTypes.CycleMarkup,
    groupName: node.groupName ? toExpression(node.groupName) : null,
    args: node.args.map(toExpression),
    position: position(node),
    source: node.source,
  };
}

function toForMarkup(node: ConcreteLavaTagForMarkup): ForMarkup {
  return {
    type: NodeTypes.ForMarkup,
    variableName: node.variableName,
    collection: toExpression(node.collection),
    args: node.args.map(toNamedArgument),
    reversed: !!node.reversed,
    position: position(node),
    source: node.source,
  };
}

function toPaginateMarkup(node: ConcretePaginateMarkup): PaginateMarkup {
  return {
    type: NodeTypes.PaginateMarkup,
    collection: toExpression(node.collection),
    pageSize: toExpression(node.pageSize),
    position: position(node),
    args: node.args ? node.args.map(toNamedArgument) : [],
    source: node.source,
  };
}

function toRawMarkup(node: ConcreteHtmlRawTag | ConcreteLavaRawTag): RawMarkup {
  return {
    type: NodeTypes.RawMarkup,
    kind: toRawMarkupKind(node),
    value: node.body,
    position: {
      start: node.blockStartLocEnd,
      end: node.blockEndLocStart,
    },
    source: node.source,
  };
}

function toRawMarkupKind(
  node: ConcreteHtmlRawTag | ConcreteLavaRawTag,
): RawMarkupKinds {
  switch (node.type) {
    case ConcreteNodeTypes.HtmlRawTag:
      return toRawMarkupKindFromHtmlNode(node);
    case ConcreteNodeTypes.LavaRawTag:
      return toRawMarkupKindFromLavaNode(node);
    default:
      return assertNever(node);
  }
}

const lavaToken = /(\{%|\{\{)-?/g;

function toRawMarkupKindFromHtmlNode(node: ConcreteHtmlRawTag): RawMarkupKinds {
  switch (node.name) {
    case 'script': {
      const scriptAttr = node.attrList?.find(
        (attr) =>
          'name' in attr &&
          typeof attr.name !== 'string' &&
          attr.name.length === 1 &&
          attr.name[0].type === ConcreteNodeTypes.TextNode &&
          attr.name[0].value === 'type',
      );

      if (
        !scriptAttr ||
        !('value' in scriptAttr) ||
        scriptAttr.value.length === 0 ||
        scriptAttr.value[0].type !== ConcreteNodeTypes.TextNode
      ) {
        return RawMarkupKinds.javascript;
      }
      const type = scriptAttr.value[0].value;

      if (type === 'text/markdown') {
        return RawMarkupKinds.markdown;
      }

      if (type === 'application/x-typescript') {
        return RawMarkupKinds.typescript;
      }

      if (type === 'text/html') {
        return RawMarkupKinds.html;
      }

      if (
        (type && (type.endsWith('json') || type.endsWith('importmap'))) ||
        type === 'speculationrules'
      ) {
        return RawMarkupKinds.json;
      }

      return RawMarkupKinds.javascript;
    }
    case 'style':
      if (lavaToken.test(node.body)) {
        return RawMarkupKinds.text;
      }
      return RawMarkupKinds.css;
    default:
      return RawMarkupKinds.text;
  }
}

function toRawMarkupKindFromLavaNode(node: ConcreteLavaRawTag): RawMarkupKinds {
  switch (node.name) {
    case 'javascript':
      return RawMarkupKinds.javascript;
    case 'stylesheet':
    case 'style':
      if (lavaToken.test(node.body)) {
        return RawMarkupKinds.text;
      }
      return RawMarkupKinds.css;
    case 'schema':
      return RawMarkupKinds.json;
    default:
      return RawMarkupKinds.text;
  }
}

function toRenderMarkup(node: ConcreteLavaTagRenderMarkup): RenderMarkup {
  return {
    type: NodeTypes.RenderMarkup,
    snippet: toExpression(node.snippet) as LavaString | LavaVariableLookup,
    alias: node.alias,
    variable: toRenderVariableExpression(node.variable),
    args: node.args.map(toNamedArgument),
    position: position(node),
    source: node.source,
  };
}

function toRenderVariableExpression(
  node: ConcreteRenderVariableExpression | null,
): RenderVariableExpression | null {
  if (!node) return null;
  return {
    type: NodeTypes.RenderVariableExpression,
    kind: node.kind,
    name: toExpression(node.name),
    position: position(node),
    source: node.source,
  };
}

function toConditionalExpression(
  nodes: ConcreteLavaCondition[],
): LavaConditionalExpression {
  if (nodes.length === 1) {
    return toComparisonOrExpression(nodes[0]);
  }

  const [first, second] = nodes;
  const [, ...rest] = nodes;
  return {
    type: NodeTypes.LogicalExpression,
    relation: second.relation as 'and' | 'or',
    left: toComparisonOrExpression(first),
    right: toConditionalExpression(rest),
    position: {
      start: first.locStart,
      end: nodes[nodes.length - 1].locEnd,
    },
    source: first.source,
  };
}

function toComparisonOrExpression(
  node: ConcreteLavaCondition,
): LavaComparison | LavaExpression {
  const expression = node.expression;
  switch (expression.type) {
    case ConcreteNodeTypes.Comparison:
      return toComparison(expression);
    default:
      return toExpression(expression);
  }
}

function toComparison(node: ConcreteLavaComparison): LavaComparison {
  return {
    type: NodeTypes.Comparison,
    comparator: node.comparator,
    left: toExpression(node.left),
    right: toExpression(node.right),
    position: position(node),
    source: node.source,
  };
}

function toLavaDrop(node: ConcreteLavaDrop): LavaDrop {
  return {
    type: NodeTypes.LavaDrop,
    markup:
      typeof node.markup === 'string'
        ? node.markup
        : toLavaVariable(node.markup),
    whitespaceStart: node.whitespaceStart ?? '',
    whitespaceEnd: node.whitespaceEnd ?? '',
    position: position(node),
    source: node.source,
  };
}

function toLavaVariable(node: ConcreteLavaVariable): LavaVariable {
  return {
    type: NodeTypes.LavaVariable,
    expression: toExpression(node.expression),
    filters: node.filters.map(toFilter),
    position: position(node),
    rawSource: node.rawSource,
    source: node.source,
  };
}

function toExpression(node: ConcreteLavaExpression): LavaExpression {
  switch (node.type) {
    case ConcreteNodeTypes.String: {
      return {
        type: NodeTypes.String,
        position: position(node),
        single: node.single,
        value: node.value,
        source: node.source,
      };
    }
    case ConcreteNodeTypes.Number: {
      return {
        type: NodeTypes.Number,
        position: position(node),
        value: node.value,
        source: node.source,
      };
    }
    case ConcreteNodeTypes.LavaLiteral: {
      return {
        type: NodeTypes.LavaLiteral,
        position: position(node),
        value: node.value,
        keyword: node.keyword,
        source: node.source,
      };
    }
    case ConcreteNodeTypes.Range: {
      return {
        type: NodeTypes.Range,
        start: toExpression(node.start),
        end: toExpression(node.end),
        position: position(node),
        source: node.source,
      };
    }
    case ConcreteNodeTypes.VariableLookup: {
      return {
        type: NodeTypes.VariableLookup,
        name: node.name,
        lookups: node.lookups.map(toExpression),
        position: position(node),
        source: node.source,
      };
    }
    default: {
      return assertNever(node);
    }
  }
}

function toFilter(node: ConcreteLavaFilter): LavaFilter {
  return {
    type: NodeTypes.LavaFilter,
    name: node.name,
    args: node.args.map(toLavaArgument),
    position: position(node),
    source: node.source,
  };
}

function toLavaArgument(node: ConcreteLavaArgument): LavaArgument {
  switch (node.type) {
    case ConcreteNodeTypes.NamedArgument: {
      return toNamedArgument(node);
    }
    default: {
      return toExpression(node);
    }
  }
}

function toNamedArgument(node: ConcreteLavaNamedArgument): LavaNamedArgument {
  return {
    type: NodeTypes.NamedArgument,
    name: node.name,
    value: toExpression(node.value),
    position: position(node),
    source: node.source,
  };
}

function toHtmlElement(
  node: ConcreteHtmlTagOpen,
  options: ASTBuildOptions,
): HtmlElement {
  return {
    type: NodeTypes.HtmlElement,
    name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
    attributes: toAttributes(node.attrList || [], options),
    position: position(node),
    blockStartPosition: position(node),
    blockEndPosition: { start: -1, end: -1 },
    children: [],
    source: node.source,
  };
}

function toHtmlDanglingMarkerOpen(
  node: ConcreteHtmlTagOpen,
  options: ASTBuildOptions,
): HtmlDanglingMarkerOpen {
  return {
    type: NodeTypes.HtmlDanglingMarkerOpen,
    name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
    attributes: toAttributes(node.attrList || [], options),
    position: position(node),
    blockStartPosition: position(node),
    source: node.source,
  };
}

function toHtmlDanglingMarkerClose(
  node: ConcreteHtmlTagClose,
  options: ASTBuildOptions,
): HtmlDanglingMarkerClose {
  return {
    type: NodeTypes.HtmlDanglingMarkerClose,
    name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
    position: position(node),
    blockStartPosition: position(node),
    source: node.source,
  };
}

function toHtmlVoidElement(
  node: ConcreteHtmlVoidElement,
  options: ASTBuildOptions,
): HtmlVoidElement {
  return {
    type: NodeTypes.HtmlVoidElement,
    name: node.name,
    attributes: toAttributes(node.attrList || [], options),
    position: position(node),
    blockStartPosition: position(node),
    source: node.source,
  };
}

function toHtmlSelfClosingElement(
  node: ConcreteHtmlSelfClosingElement,
  options: ASTBuildOptions,
): HtmlSelfClosingElement {
  return {
    type: NodeTypes.HtmlSelfClosingElement,
    name: cstToAst(node.name, options) as (TextNode | LavaDrop)[],
    attributes: toAttributes(node.attrList || [], options),
    position: position(node),
    blockStartPosition: position(node),
    source: node.source,
  };
}

function toTextNode(node: ConcreteTextNode): TextNode {
  return {
    type: NodeTypes.TextNode,
    value: node.value,
    position: position(node),
    source: node.source,
  };
}

const MAX_NUMBER_OF_SIBLING_DANGLING_NODES = 2;

function isAcceptableDanglingMarkerOpen(
  builder: ASTBuilder,
  cst: LavaHtmlCST,
  currIndex: number,
): boolean {
  return isAcceptableDanglingMarker(
    builder,
    cst,
    currIndex,
    ConcreteNodeTypes.HtmlTagOpen,
  );
}

function isAcceptableDanglingMarkerClose(
  builder: ASTBuilder,
  cst: LavaHtmlCST,
  currIndex: number,
): boolean {
  return isAcceptableDanglingMarker(
    builder,
    cst,
    currIndex,
    ConcreteNodeTypes.HtmlTagClose,
  );
}

function isAcceptableDanglingMarker(
  builder: ASTBuilder,
  cst: LavaHtmlCST,
  currIndex: number,
  nodeType: ConcreteNodeTypes.HtmlTagOpen | ConcreteNodeTypes.HtmlTagClose,
): boolean {
  if (!isAcceptingDanglingMarkers(builder, nodeType)) {
    return false;
  }

  const maxIndex = Math.min(
    cst.length,
    currIndex + MAX_NUMBER_OF_SIBLING_DANGLING_NODES - builder.current.length,
  );

  for (let i = currIndex; i <= maxIndex; i++) {
    if (isConcreteExceptionEnd(cst[i])) {
      return true;
    }
    if (cst[i].type !== nodeType) {
      return false;
    }
  }

  return false;
}

const DanglingMapping = {
  [ConcreteNodeTypes.HtmlTagOpen]: NodeTypes.HtmlDanglingMarkerOpen,
  [ConcreteNodeTypes.HtmlTagClose]: NodeTypes.HtmlDanglingMarkerClose,
} as const;

function isAcceptingDanglingMarkers(
  builder: ASTBuilder,
  nodeType: ConcreteNodeTypes.HtmlTagOpen | ConcreteNodeTypes.HtmlTagClose,
) {
  const { parent, grandparent } = builder;
  if (!parent || !grandparent) return false;
  return (
    parent.type === NodeTypes.LavaBranch &&
    grandparent.type === NodeTypes.LavaTag &&
    ['if', 'unless', 'case'].includes(grandparent.name) &&
    builder.current.every((node) => node.type === DanglingMapping[nodeType])
  );
}

// checking that is a {% else %} or {% endif %}
function isConcreteExceptionEnd(node: LavaHtmlConcreteNode | undefined) {
  return (
    !node ||
    node.type === ConcreteNodeTypes.LavaTagClose ||
    isConcreteLavaBranchDisguisedAsTag(node)
  );
}

function markup(name: string, markup: string) {
  if (TAGS_WITHOUT_MARKUP.includes(name)) return '';
  return markup;
}

function position(node: HasPosition): Position {
  return {
    start: node.locStart,
    end: node.locEnd,
  };
}

export function walk(
  ast: LavaHtmlNode,
  fn: (ast: LavaHtmlNode, parentNode: LavaHtmlNode | undefined) => void,
  parentNode?: LavaHtmlNode,
) {
  for (const key of Object.keys(ast)) {
    if (nonTraversableProperties.has(key)) {
      continue;
    }

    const value = (ast as any)[key];
    if (Array.isArray(value)) {
      value
        .filter(isLavaHtmlNode)
        .forEach((node: LavaHtmlNode) => walk(node, fn, ast));
    } else if (isLavaHtmlNode(value)) {
      walk(value, fn, ast);
    }
  }

  fn(ast, parentNode);
}
