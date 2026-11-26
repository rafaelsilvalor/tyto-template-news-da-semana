import { readFileSync } from 'node:fs';

import { createFaceCache, defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { capOffset } from '@tyto/template-kit';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { NEWS, build } from '../src/template.js';

import type { Frame, SceneNode, TextNode } from '@tyto/core';

/**
 * The list is centred on the lines it is measured to take, not on an estimate (TYTO-895).
 *
 * The other tests compile with nothing to measure, so they see only the estimate the template
 * falls back to. Here the example is measured against the stand-in face of `price-break.test.ts`
 * (Source Sans 3 under the template's family, never the licensed face): the lines the compiled
 * text breaks into are the ones its middle — first capitals to last baseline — sits on.
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
const faces = createFaceCache({
  outlines: (face) =>
    face.family === 'CircularXX' ? (face.weight >= 700 ? bold : regular) : undefined,
});

/** CircularXX's cap height, in em: the kit's default metrics, which the template draws with. */
const CAP_HEIGHT = 0.709;

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

describe('the news, measured', () => {
  it('centre the lines they break into on the reference middle, on every slide', async () => {
    const result = await compileTemplate({
      brief: read('../templates/news-da-semana/examples/semana.brief').toString('utf8'),
      template,
      formats,
      faces,
    });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));

    const slides = result.value.scene.artworks.flatMap((artwork) => artwork.frames);
    expect(slides).toHaveLength(2);
    const counts: number[] = [];
    for (const slide of slides) {
      const news = nodes(slide).find(
        (node): node is TextNode => node.kind === 'text' && node.name === 'noticias',
      )!;
      const lines = news.runs.filter((piece) => piece.kind === 'break').length + 1;
      counts.push(lines);
      const capTop = news.transform.y + capOffset(NEWS.size, NEWS.lineHeight);
      const baseline = capTop + (lines - 1) * NEWS.size * NEWS.lineHeight + NEWS.size * CAP_HEIGHT;
      expect((capTop + baseline) / 2).toBeCloseTo(NEWS.centre, 6);
    }
    // Measured with the stand-in, the slides' 12 and 7 written lines wrap to 13 and 10.
    expect(counts).toEqual([13, 10]);
  });
});
