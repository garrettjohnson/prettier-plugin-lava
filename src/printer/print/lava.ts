import { AstPath, Doc, doc } from 'prettier';
import {
  LavaTag,
  LavaBranch,
  LavaDrop,
  LavaAstPath,
  LavaParserOptions,
  LavaPrinter,
  NodeTypes,
  LavaPrinterArgs,
} from '~/types';
import { isBranchedTag } from '~/parser/ast';
import { assertNever } from '~/utils';

import {
  getWhitespaceTrim,
  hasMeaningfulLackOfLeadingWhitespace,
  hasMeaningfulLackOfTrailingWhitespace,
  hasMeaningfulLackOfDanglingWhitespace,
  isDeeplyNested,
  isEmpty,
  isHtmlNode,
  markupLines,
  originallyHadLineBreaks,
  reindent,
  trim,
} from '~/printer/utils';

import { printChildren } from '~/printer/print/children';

const LAVA_TAGS_THAT_ALWAYS_BREAK = ['for', 'case'];

const { builders } = doc;
const { group, hardline, ifBreak, indent, join, line, softline } = builders;

export function printLavaDrop(
  path: LavaAstPath,
  _options: LavaParserOptions,
  _print: LavaPrinter,
  { leadingSpaceGroupId, trailingSpaceGroupId }: LavaPrinterArgs,
) {
  const node: LavaDrop = path.getValue() as LavaDrop;
  const whitespaceStart = getWhitespaceTrim(
    node.whitespaceStart,
    hasMeaningfulLackOfLeadingWhitespace(node),
    leadingSpaceGroupId,
  );
  const whitespaceEnd = getWhitespaceTrim(
    node.whitespaceEnd,
    hasMeaningfulLackOfTrailingWhitespace(node),
    trailingSpaceGroupId,
  );

  // This should probably be better than this but it'll do for now.
  const lines = markupLines(node);
  if (lines.length > 1) {
    return group([
      '{{',
      whitespaceStart,
      indent([hardline, join(hardline, lines.map(trim))]),
      hardline,
      whitespaceEnd,
      '}}',
    ]);
  }

  return group([
    '{{',
    whitespaceStart,
    ' ',
    node.markup,
    ' ',
    whitespaceEnd,
    '}}',
  ]);
}

export function printLavaBlockStart(
  path: AstPath<LavaTag | LavaBranch>,
  leadingSpaceGroupId: symbol | symbol[] | undefined,
  trailingSpaceGroupId: symbol | symbol[] | undefined,
): Doc {
  const node = path.getValue();
  if (!node.name) return '';

  const lines = markupLines(node);

  const whitespaceStart = getWhitespaceTrim(
    node.whitespaceStart,
    needsBlockStartLeadingWhitespaceStrippingOnBreak(node),
    leadingSpaceGroupId,
  );
  const whitespaceEnd = getWhitespaceTrim(
    node.whitespaceEnd,
    needsBlockStartTrailingWhitespaceStrippingOnBreak(node),
    trailingSpaceGroupId,
  );

  if (node.name === 'lava') {
    return group([
      '{%',
      whitespaceStart,
      ' ',
      node.name,
      indent([hardline, join(hardline, reindent(lines, true))]),
      hardline,
      whitespaceEnd,
      '%}',
    ]);
  }

  if (lines.length > 1) {
    return group([
      '{%',
      whitespaceStart,
      indent([hardline, node.name, ' ', join(hardline, lines.map(trim))]),
      hardline,
      whitespaceEnd,
      '%}',
    ]);
  }

  const markup = node.markup;
  return group([
    '{%',
    whitespaceStart,
    ' ',
    node.name,
    markup ? ` ${markup}` : '',
    ' ',
    whitespaceEnd,
    '%}',
  ]);
}

export function printLavaBlockEnd(
  path: AstPath<LavaTag>,
  leadingSpaceGroupId: symbol | symbol[] | undefined,
  trailingSpaceGroupId: symbol | symbol[] | undefined,
): Doc {
  const node = path.getValue();
  if (!node.children || !node.blockEndPosition) return '';
  const whitespaceStart = getWhitespaceTrim(
    node.delimiterWhitespaceStart ?? '',
    needsBlockEndLeadingWhitespaceStrippingOnBreak(node),
    leadingSpaceGroupId,
  );
  const whitespaceEnd = getWhitespaceTrim(
    node.delimiterWhitespaceEnd ?? '',
    hasMeaningfulLackOfTrailingWhitespace(node),
    trailingSpaceGroupId,
  );
  return group([
    '{%',
    whitespaceStart,
    ` end${node.name} `,
    whitespaceEnd,
    '%}',
  ]);
}

export function printLavaTag(
  path: AstPath<LavaTag>,
  options: LavaParserOptions,
  print: LavaPrinter,
  { leadingSpaceGroupId, trailingSpaceGroupId }: LavaPrinterArgs = {},
): Doc {
  const node = path.getValue();
  if (!node.children || !node.blockEndPosition) {
    return printLavaBlockStart(
      path,
      leadingSpaceGroupId,
      trailingSpaceGroupId,
    );
  }
  const tagGroupId = Symbol('tag-group');
  const blockStart = printLavaBlockStart(
    path,
    leadingSpaceGroupId,
    tagGroupId,
  ); // {% if ... %}
  const blockEnd = printLavaBlockEnd(path, tagGroupId, trailingSpaceGroupId); // {% endif %}

  let body: Doc = [];

  if (isBranchedTag(node)) {
    body = cleanDoc(
      path.map(
        (p) =>
          print(p, {
            leadingSpaceGroupId: tagGroupId,
            trailingSpaceGroupId: tagGroupId,
          }),
        'children',
      ),
    );
    if (node.name === 'case') body = indent(body);
  } else if (node.children.length > 0) {
    body = indent([
      innerLeadingWhitespace(node),
      printChildren(path, options, print, {
        leadingSpaceGroupId: tagGroupId,
        trailingSpaceGroupId: tagGroupId,
      }),
    ]);
  }

  return group([blockStart, body, innerTrailingWhitespace(node), blockEnd], {
    id: tagGroupId,
    shouldBreak:
      LAVA_TAGS_THAT_ALWAYS_BREAK.includes(node.name) ||
      originallyHadLineBreaks(path, options) ||
      isAttributeNode(node) ||
      isDeeplyNested(node),
  });
}

function isAttributeNode(node: LavaTag) {
  return (
    isHtmlNode(node.parentNode) &&
    node.parentNode.attributes.indexOf(node) !== -1
  );
}

function innerLeadingWhitespace(node: LavaTag | LavaBranch) {
  if (!node.firstChild) {
    if (node.isDanglingWhitespaceSensitive && node.hasDanglingWhitespace) {
      return line;
    } else {
      return '';
    }
  }

  if (
    node.firstChild.hasLeadingWhitespace &&
    node.firstChild.isLeadingWhitespaceSensitive
  ) {
    return line;
  }

  return softline;
}

function innerTrailingWhitespace(node: LavaTag | LavaBranch) {
  if (
    node.type === NodeTypes.LavaBranch ||
    !node.blockEndPosition ||
    !node.lastChild
  ) {
    return '';
  }

  if (
    node.lastChild.hasTrailingWhitespace &&
    node.lastChild.isTrailingWhitespaceSensitive
  ) {
    return line;
  }

  return softline;
}

function printLavaDefaultBranch(
  path: AstPath<LavaBranch>,
  options: LavaParserOptions,
  print: LavaPrinter,
  args: LavaPrinterArgs,
): Doc {
  const branch = path.getValue();
  const parentNode: LavaTag = path.getParentNode() as any;

  // When the node is empty and the parent is empty. The space will come
  // from the trailingWhitespace of the parent. When this happens, we don't
  // want the branch to print another one so we collapse it.
  // e.g. {% if A %} {% endif %}
  const shouldCollapseSpace =
    isEmpty(branch.children) && parentNode.children!.length === 1;
  if (shouldCollapseSpace) return '';

  // When the branch is empty and doesn't have whitespace, we don't want
  // anything so print nothing.
  // e.g. {% if A %}{% endif %}
  // e.g. {% if A %}{% else %}...{% endif %}
  const isBranchEmptyWithoutSpace =
    isEmpty(branch.children) && !branch.hasDanglingWhitespace;
  if (isBranchEmptyWithoutSpace) return '';

  // If the branch does not break, is empty and had whitespace, we might
  // want a space in there. We don't collapse those because the trailing
  // whitespace does not come from the parent.
  // {% if A %} {% else %}...{% endif %}
  if (branch.hasDanglingWhitespace) {
    return ifBreak('', ' ');
  }

  // Otherwise print the branch as usual
  // {% if A %} content...{% endif %}
  return indent([
    innerLeadingWhitespace(parentNode),
    printChildren(path, options, print, args),
  ]);
}

export function printLavaBranch(
  path: AstPath<LavaBranch>,
  options: LavaParserOptions,
  print: LavaPrinter,
  args: LavaPrinterArgs,
): Doc {
  const branch = path.getValue();
  const isDefaultBranch = !branch.name;

  if (isDefaultBranch) {
    return printLavaDefaultBranch(path, options, print, args);
  }

  const leftSibling = branch.prev as LavaBranch | undefined;

  // When the left sibling is empty, its trailing whitespace is its leading
  // whitespace. So we should collapse it here and ignore it.
  const shouldCollapseSpace = leftSibling && isEmpty(leftSibling.children);
  const outerLeadingWhitespace =
    branch.hasLeadingWhitespace && !shouldCollapseSpace ? line : softline;

  return [
    outerLeadingWhitespace,
    printLavaBlockStart(
      path as AstPath<LavaBranch>,
      args.leadingSpaceGroupId,
      args.trailingSpaceGroupId,
    ),
    indent([
      innerLeadingWhitespace(branch),
      printChildren(path, options, print, args),
    ]),
  ];
}

function needsBlockStartLeadingWhitespaceStrippingOnBreak(
  node: LavaTag | LavaBranch,
): boolean {
  switch (node.type) {
    case NodeTypes.LavaTag: {
      return (
        !isAttributeNode(node) && hasMeaningfulLackOfLeadingWhitespace(node)
      );
    }
    case NodeTypes.LavaBranch: {
      return (
        !isAttributeNode(node.parentNode! as LavaTag) &&
        hasMeaningfulLackOfLeadingWhitespace(node)
      );
    }
    default: {
      return assertNever(node);
    }
  }
}

function needsBlockStartTrailingWhitespaceStrippingOnBreak(
  node: LavaTag | LavaBranch,
): boolean {
  switch (node.type) {
    case NodeTypes.LavaTag: {
      if (isBranchedTag(node)) {
        return needsBlockStartLeadingWhitespaceStrippingOnBreak(
          node.firstChild! as LavaBranch,
        );
      }

      if (!node.children) {
        return hasMeaningfulLackOfTrailingWhitespace(node);
      }

      return isEmpty(node.children)
        ? hasMeaningfulLackOfDanglingWhitespace(node)
        : hasMeaningfulLackOfLeadingWhitespace(node.firstChild!);
    }

    case NodeTypes.LavaBranch: {
      if (isAttributeNode(node.parentNode! as LavaTag)) {
        return false;
      }

      return node.firstChild
        ? hasMeaningfulLackOfLeadingWhitespace(node.firstChild)
        : hasMeaningfulLackOfDanglingWhitespace(node);
    }

    default: {
      return assertNever(node);
    }
  }
}

function needsBlockEndLeadingWhitespaceStrippingOnBreak(node: LavaTag) {
  if (!node.children) {
    throw new Error(
      'Should only call needsBlockEndLeadingWhitespaceStrippingOnBreak for tags that have closing tags',
    );
  } else if (isAttributeNode(node)) {
    return false;
  } else if (isBranchedTag(node)) {
    return hasMeaningfulLackOfTrailingWhitespace(node.lastChild!);
  } else if (isEmpty(node.children)) {
    return hasMeaningfulLackOfDanglingWhitespace(node);
  } else {
    return hasMeaningfulLackOfTrailingWhitespace(node.lastChild!);
  }
}

function cleanDoc(doc: Doc[]): Doc[] {
  return doc.filter((x) => x !== '');
}
