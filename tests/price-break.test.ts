import { readFileSync } from 'node:fs';

import { createFaceCache, defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build } from '../src/template.js';

import type { Frame, SceneNode, TextNode } from '@tyto/core';

/**
 * A price never splits from its sign, with the lines measured (TYTO-593).
 *
 * The gallery preview of v0.2.0 ended a line on "R$" and began the next with "9,8 mil". Here
 * the break is decided the way Tyto decides it, by measuring, against a stand-in face: Source
 * Sans 3 (OFL, `__fixtures__/stand-in/LICENSE.md`), whose family is its own and which only
 * this test serves under the name CircularXX — the licensed face is never committed. Its
 * widths are not CircularXX's, so the line below is the one that breaks at "R$" with it:
 * without the no-break space the template writes there, the measured layout puts "R$" on the
 * first line and "9,8 mil" on the second.
 */

const read = (path: string): Buffer => readFileSync(new URL(path, import.meta.url));

const manifest = parseManifest(
  read('../templates/news-da-semana/manifest.yaml').toString('utf8'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

const regular = new Uint8Array(read('./__fixtures__/stand-in/SourceSans3-Regular.woff2'));
const bold = new Uint8Array(read('./__fixtures__/stand-in/SourceSans3-Bold.woff2'));
/** The stand-in under the template's family: Bold for Bold, Regular for every lighter weight. */
const faces = createFaceCache({
  outlines: (face) =>
    face.family === 'CircularXX' ? (face.weight >= 700 ? bold : regular) : undefined,
});

/** With plain spaces, the stand-in breaks this line between "R$" and "9,8". */
const LINE = 'QCX Norte: 320 vagas para Analista e inicial de R$ 9,8 mil';

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

describe('a price in the news, measured', () => {
  it('keeps "R$ 9,8 mil" on one line where plain spaces would split it', async () => {
    const result = await compileTemplate({
      brief: `---\ntemplate: news-da-semana\nformats: [grid]\n---\n::lamina\n  ${LINE}\n`,
      template,
      formats,
      faces,
    });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));

    const [slide] = result.value.scene.artworks.flatMap((artwork) => artwork.frames);
    const news = nodes(slide!).find(
      (node): node is TextNode => node.kind === 'text' && node.name === 'noticias',
    );
    const drawn = (news?.runs ?? [])
      .map((piece) => (piece.kind === 'text' ? piece.text : '\n'))
      .join('')
      .replaceAll(String.fromCodePoint(0xa0), ' ')
      .split('\n');

    expect(drawn).toHaveLength(2);
    expect(drawn.find((line) => line.includes('R$'))).toContain('R$ 9,8 mil');
  });
});
