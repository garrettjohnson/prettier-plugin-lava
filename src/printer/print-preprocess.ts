import * as AST from '~/parser/stage-2-ast';
import { LavaParserOptions, DocumentNode } from '~/types';
import { AUGMENTATION_PIPELINE } from '~/printer/preprocess';

// This is super hard to type check so I'll just magically assume
// everything works.
export function preprocess(
  ast: AST.DocumentNode,
  options: LavaParserOptions,
): DocumentNode {
  const augmentationPipeline = AUGMENTATION_PIPELINE.map((fn) =>
    fn.bind(null, options),
  );

  for (const augmentation of augmentationPipeline) {
    AST.walk(ast, augmentation as any);
  }

  return ast as DocumentNode;
}
