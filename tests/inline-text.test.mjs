import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { inlineText } from './support/inline-text.mjs';

const clean = `
import { copy } from "./copy";
export const A = ({ name }) => <button class="primary" type="button" aria-label={copy.files.removeLabel(name)} title={copy.export.clearAllTooltip}>×</button>;
export const B = () => <span data-state="idle" role="status">{copy.files.waiting}{" · "}{x ? \`\${a} · \${b}\` : ""}00:00</span>;
`;
test('the scanner passes a component whose text all comes from the copy module and ignores technical strings', () => {
  assert.deepEqual(inlineText(clean), []);
});

test('the scanner flags text written inline in each place a person can read or hear it', () => {
  const dirty = (body, ...expected) => assert.deepEqual(inlineText(body).map(item => item.text), expected, body);
  dirty('export const A = () => <p>Hello there</p>;', 'Hello there');
  dirty('export const A = () => <button aria-label="Remove file">x</button>;', 'Remove file');
  dirty('export const A = () => <input placeholder={`Pick a time`} />;', 'Pick a time');
  dirty('export const A = ({ x }) => <p>{x ? "Done" : copy.a}</p>;', 'Done');
  dirty('export const A = ({ x }) => <p>{x && "Saved now"}</p>;', 'Saved now');
  dirty('export const A = () => <Choices options={[{ value: "a", label: "Alpha" }]} />;', 'Alpha');
  dirty('export const A = ({ n }) => <title-box title={`Download ${n}`} />;', 'Download');
});

const components = readdirSync(new URL('../src/', import.meta.url)).filter(name => name.endsWith('.tsx')).sort();
test('every component reads its visible text from src/copy.ts', () => {
  assert.deepEqual(components, ['file-row.tsx', 'main.tsx', 'recipe-editor.tsx', 'trim-fields.tsx']);
  const inline = components.flatMap(name => inlineText(readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'), name));
  assert.deepEqual(inline, [], 'inline user-facing text found; move it into src/copy.ts');
});
