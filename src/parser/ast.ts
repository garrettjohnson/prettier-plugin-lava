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
  LavaHtmlCST,
  LavaHtmlConcreteNode,
  toLavaHtmlCST,
  ConcreteHtmlSelfClosingElement,
  ConcreteAttrSingleQuoted,
  ConcreteAttrDoubleQuoted,
  ConcreteAttrUnquoted,
} from '~/parser/cst';
import { NodeTypes, Position } from '~/types';
import { assertNever, deepGet, dropLast } from '~/utils';
import { LavaHTMLASTParsingError } from '~/parser/errors';

export type LavaHtmlNode =
  | DocumentNode
  | LavaNode
  | HtmlNode
  | AttributeNode
  | TextNode;

export interface DocumentNode extends ASTNode<NodeTypes.Document> {
  children: LavaHtmlNode[];
  name: '#document';
}

export type LavaNode = LavaRawTag | LavaTag | LavaDrop | LavaBranch;

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

export type ParentNode = Extract<
  LavaHtmlNode,
  HasChildren | HasAttributes | HasValue | HasName
>;

export interface LavaRawTag extends ASTNode<NodeTypes.LavaRawTag> {
  /**
   * e.g. raw, style, javascript
   */
  name: string;

  /**
   * String body of the tag. So we don't try to parse it.
   */
  body: string;
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  delimiterWhitespaceStart: '-' | '';
  delimiterWhitespaceEnd: '-' | '';
  blockStartPosition: Position;
  blockEndPosition: Position;
}

export interface LavaTag extends ASTNode<NodeTypes.LavaTag> {
  /**
   * e.g. if, ifchanged, for, etc.
   */
  name: string;

  /**
   * The body of the tag. May contain arguments. Excludes the name of the tag. Left trimmed.
   */
  markup: string;
  children?: LavaHtmlNode[];
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  delimiterWhitespaceStart?: '-' | '';
  delimiterWhitespaceEnd?: '-' | '';
  blockStartPosition: Position;
  blockEndPosition?: Position;
}

export interface LavaBranch extends ASTNode<NodeTypes.LavaBranch> {
  /**
   * e.g. else, elsif, when | null when in the main branch
   */
  name: string | null;

  /**
   * The body of the branch tag. May contain arguments. Excludes the name of the tag. Left trimmed.
   */
  markup: string;
  children: LavaHtmlNode[];
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
  blockStartPosition: Position;
}

export interface LavaDrop extends ASTNode<NodeTypes.LavaDrop> {
  /**
   * The body of the drop. May contain filters. Not trimmed.
   */
  markup: string;
  whitespaceStart: '-' | '';
  whitespaceEnd: '-' | '';
}

export type HtmlNode =
  | HtmlComment
  | HtmlElement
  | HtmlVoidElement
  | HtmlSelfClosingElement
  | HtmlRawNode;

export interface HtmlElement extends HtmlNodeBase<NodeTypes.HtmlElement> {
  blockEndPosition: Position;
  children: LavaHtmlNode[];
}
export interface HtmlVoidElement
  extends HtmlNodeBase<NodeTypes.HtmlVoidElement> {
  name: string;
}
export interface HtmlSelfClosingElement
  extends HtmlNodeBase<NodeTypes.HtmlSelfClosingElement> {}
export interface HtmlRawNode extends HtmlNodeBase<NodeTypes.HtmlRawNode> {
  /**
   * The innerHTML of the tag as a string. Not trimmed. Not parsed.
   */
  body: string;
  name: string;
  blockEndPosition: Position;
}
export interface HtmlComment extends ASTNode<NodeTypes.HtmlComment> {
  body: string;
}

export interface HtmlNodeBase<T> extends ASTNode<T> {
  /**
   * e.g. div, span, h1, h2, h3...
   */
  name: string | LavaDrop;
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
  name: string;
}

export type ValueNode = TextNode | LavaNode;

export interface AttributeNodeBase<T> extends ASTNode<T> {
  name: string;
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

export function isBranchedTag(node: LavaHtmlNode) {
  return (
    node.type === NodeTypes.LavaTag &&
    ['if', 'for', 'unless', 'case'].includes(node.name)
  );
}

// Not exported because you can use node.type === NodeTypes.LavaBranch.
function isBranchTag(node: LavaHtmlNode) {
  return (
    node.type === NodeTypes.LavaTag &&
    ['else', 'elsif', 'when'].includes(node.name)
  );
}

export function toLavaHtmlAST(text: string): DocumentNode {
  const cst = toLavaHtmlCST(text);
  const root: DocumentNode = {
    type: NodeTypes.Document,
    source: text,
    children: cstToAst(cst, text),
    name: '#document',
    position: {
      start: 0,
      end: text.length,
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

  open(node: LavaHtmlNode) {
    this.current.push(node);
    this.cursor.push(this.currentPosition);
    this.cursor.push('children');

    if (isBranchedTag(node)) {
      this.open({
        type: NodeTypes.LavaBranch,
        name: null,
        markup: '',
        position: {
          start: node.position.end,
          end: node.position.end,
        },
        blockStartPosition: {
          start: node.position.end,
          end: node.position.end,
        },
        children: [],
        whitespaceStart: '',
        whitespaceEnd: '',
        source: this.source,
      });
    }
  }

  push(node: LavaHtmlNode) {
    if (node.type === NodeTypes.LavaTag && isBranchTag(node)) {
      this.cursor.pop();
      this.cursor.pop();
      this.open({
        name: node.name,
        type: NodeTypes.LavaBranch,
        markup: node.markup,
        position: { ...node.position },
        children: [],
        blockStartPosition: { ...node.position },
        whitespaceStart: node.whitespaceStart,
        whitespaceEnd: node.whitespaceEnd,
        source: this.source,
      });
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
    if (this.parent?.type === NodeTypes.LavaBranch) {
      this.parent.position.end = node.locStart;
      this.cursor.pop();
      this.cursor.pop();
    }

    if (
      getName(this.parent) !== getName(node) ||
      this.parent?.type !== nodeType
    ) {
      throw new LavaHTMLASTParsingError(
        `Attempting to close ${nodeType} '${node.name}' before ${this.parent?.type} '${this.parent?.name}' was closed`,
        this.source,
        this.parent?.position?.start || 0,
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

function getName(
  node: ConcreteLavaTagClose | ConcreteHtmlTagClose | ParentNode | undefined,
): string | LavaDrop | null {
  if (!node) return null;
  switch (node.type) {
    case NodeTypes.HtmlElement:
    case ConcreteNodeTypes.HtmlTagClose:
      if (typeof node.name === 'string') return node.name;
      return `{{${node.name.markup.trim()}}}`;
    default:
      return node.name;
  }
}

export function cstToAst(
  cst: LavaHtmlCST | ConcreteAttributeNode[],
  source: string,
): LavaHtmlNode[] {
  const builder = new ASTBuilder(source);

  for (const node of cst) {
    switch (node.type) {
      case ConcreteNodeTypes.TextNode: {
        builder.push({
          type: NodeTypes.TextNode,
          value: node.value,
          position: position(node),
          source,
        });
        break;
      }

      case ConcreteNodeTypes.LavaDrop: {
        builder.push(toLavaDrop(node, source));
        break;
      }

      case ConcreteNodeTypes.LavaTagOpen: {
        builder.open({
          type: NodeTypes.LavaTag,
          markup: node.markup,
          position: position(node),
          children: [],
          name: node.name,
          whitespaceStart: node.whitespaceStart ?? '',
          whitespaceEnd: node.whitespaceEnd ?? '',
          blockStartPosition: position(node),
          source,
        });
        break;
      }

      case ConcreteNodeTypes.LavaTagClose: {
        builder.close(node, NodeTypes.LavaTag);
        break;
      }

      case ConcreteNodeTypes.LavaTag: {
        builder.push({
          type: NodeTypes.LavaTag,
          markup: node.markup,
          position: position(node),
          name: node.name,
          whitespaceStart: node.whitespaceStart ?? '',
          whitespaceEnd: node.whitespaceEnd ?? '',
          blockStartPosition: position(node),
          source,
        });
        break;
      }

      case ConcreteNodeTypes.LavaRawTag: {
        builder.push({
          type: NodeTypes.LavaRawTag,
          name: node.name,
          body: node.body,
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
          source,
        });
        break;
      }

      case ConcreteNodeTypes.HtmlTagOpen: {
        builder.open(toHtmlElement(node, source));
        break;
      }

      case ConcreteNodeTypes.HtmlTagClose: {
        builder.close(node, NodeTypes.HtmlElement);
        break;
      }

      case ConcreteNodeTypes.HtmlVoidElement: {
        builder.push(toHtmlVoidElement(node, source));
        break;
      }

      case ConcreteNodeTypes.HtmlSelfClosingElement: {
        builder.push(toHtmlSelfClosingElement(node, source));
        break;
      }

      case ConcreteNodeTypes.HtmlComment: {
        builder.push({
          type: NodeTypes.HtmlComment,
          body: node.body,
          position: position(node),
          source,
        });
        break;
      }

      case ConcreteNodeTypes.HtmlRawTag: {
        builder.push({
          type: NodeTypes.HtmlRawNode,
          name: node.name,
          body: node.body,
          attributes: toAttributes(node.attrList || [], source),
          position: position(node),
          source,
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
          name: node.name,
          position: position(node),
          source,
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
            name: node.name,
            position: position(node),
            source,

            // placeholders
            attributePosition: { start: -1, end: -1 },
            value: [],
          };
        const value = toAttributeValue(node.value, source);
        abstractNode.value = value;
        abstractNode.attributePosition = toAttributePosition(node, value);
        builder.push(abstractNode);
        break;
      }

      default: {
        assertNever(node);
      }
    }
  }

  return builder.ast;
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
      start: node.locStart + node.name.length + '='.length + '"'.length,
      // name=""
      // 012345678
      // 0 + 4 + 1 + 1
      // = 6
      end: node.locStart + node.name.length + '='.length + '"'.length,
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
  source: string,
): (LavaNode | TextNode)[] {
  return cstToAst(value, source) as (LavaNode | TextNode)[];
}

function toAttributes(
  attrList: ConcreteAttributeNode[],
  source: string,
): AttributeNode[] {
  return cstToAst(attrList, source) as AttributeNode[];
}

function toName(name: string | ConcreteLavaDrop, source: string) {
  if (typeof name === 'string') return name;
  return toLavaDrop(name, source);
}

function toLavaDrop(node: ConcreteLavaDrop, source: string): LavaDrop {
  return {
    type: NodeTypes.LavaDrop,
    markup: node.markup,
    whitespaceStart: node.whitespaceStart ?? '',
    whitespaceEnd: node.whitespaceEnd ?? '',
    position: position(node),
    source,
  };
}

function toHtmlElement(node: ConcreteHtmlTagOpen, source: string): HtmlElement {
  return {
    type: NodeTypes.HtmlElement,
    name: toName(node.name, source),
    attributes: toAttributes(node.attrList || [], source),
    position: position(node),
    blockStartPosition: position(node),
    blockEndPosition: { start: -1, end: -1 },
    children: [],
    source,
  };
}

function toHtmlVoidElement(
  node: ConcreteHtmlVoidElement,
  source: string,
): HtmlVoidElement {
  return {
    type: NodeTypes.HtmlVoidElement,
    name: node.name,
    attributes: toAttributes(node.attrList || [], source),
    position: position(node),
    blockStartPosition: position(node),
    source,
  };
}

function toHtmlSelfClosingElement(
  node: ConcreteHtmlSelfClosingElement,
  source: string,
): HtmlSelfClosingElement {
  return {
    type: NodeTypes.HtmlSelfClosingElement,
    name: toName(node.name, source),
    attributes: toAttributes(node.attrList || [], source),
    position: position(node),
    blockStartPosition: position(node),
    source,
  };
}

function position(
  node: LavaHtmlConcreteNode | ConcreteAttributeNode,
): Position {
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
  for (const key of ['children', 'attributes']) {
    if (key in ast) {
      (ast as any)[key].forEach((node: LavaHtmlNode) => walk(node, fn, ast));
    }
  }

  if ('value' in ast) {
    if (Array.isArray(ast.value)) {
      ast.value.forEach((node) => walk(node, fn, ast));
    }
  }

  if ('name' in ast) {
    if (ast.name && typeof ast.name !== 'string' && ast.name.type) {
      fn(ast.name, ast);
    }
  }

  fn(ast, parentNode);
}
