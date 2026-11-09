import { parse } from '@babel/parser';

/**
 * Finds user-facing text written inline in a component instead of read from src/copy.ts.
 *
 * It looks only where a person can see or hear the text, so class names, ids, event names and
 * other technical strings never count:
 *  1. JSX text that contains letters.
 *  2. A string or template literal given to a visible attribute (VISIBLE_ATTRIBUTES).
 *  3. A string or template literal that is a JSX child, alone or as a branch of ? : && ||.
 *  4. A string or template literal under an object key that names text (TEXT_KEYS).
 *
 * Allowlist, by rule rather than by name. Text with no letters is allowed (glyphs such as the
 * multiplication sign on the remove button, grip dots, the dot separator, clock placeholders like
 * 00:00). Everything else must come from the copy module.
 */
export const VISIBLE_ATTRIBUTES = new Set(['aria-label', 'aria-valuetext', 'aria-description', 'title', 'placeholder', 'alt', 'label']);
export const TEXT_KEYS = new Set(['label', 'title', 'message', 'text', 'description', 'placeholder', 'heading']);
const hasWords = text => /[A-Za-z]{2,}/.test(text);

function staticText(node) {
  if (!node) return [];
  switch (node.type) {
    case 'StringLiteral': return [node.value];
    case 'TemplateLiteral': return node.quasis.map(quasi => quasi.value.cooked ?? '');
    case 'ConditionalExpression': return [...staticText(node.consequent), ...staticText(node.alternate)];
    case 'LogicalExpression': return [...staticText(node.left), ...staticText(node.right)];
    case 'ParenthesizedExpression': return staticText(node.expression);
    default: return [];
  }
}

export function inlineText(source, file = 'component.tsx') {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'], errorRecovery: false });
  const found = [];
  const report = (node, text) => {
    if (hasWords(text)) found.push({ file, line: node.loc.start.line, text: text.trim() });
  };
  const visit = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXText') report(node, node.value);
    if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier' && VISIBLE_ATTRIBUTES.has(node.name.name)) {
      const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
      for (const text of staticText(value)) report(node, text);
    }
    if (node.type === 'JSXExpressionContainer' && (parent?.type === 'JSXElement' || parent?.type === 'JSXFragment'))
      for (const text of staticText(node.expression)) report(node, text);
    if (node.type === 'ObjectProperty' && !node.computed) {
      const key = node.key.type === 'Identifier' ? node.key.name : node.key.value;
      if (TEXT_KEYS.has(key)) for (const text of staticText(node.value)) report(node, text);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      if (Array.isArray(child)) for (const item of child) visit(item, node);
      else if (child && typeof child === 'object') visit(child, node);
    }
  };
  visit(ast.program, null);
  return found;
}
