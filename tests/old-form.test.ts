import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { NO_BREAK_SPACE } from '@tyto/template-kit';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build } from '../src/template.js';

/**
 * A brief written the v0.2.0 way, `**Label:** words`, draws what v0.2.0 drew (TYTO-594).
 *
 * v0.3.0 reads a line's label as what comes before its first `:`, and `**…**` stays the
 * highlight, Bold in the label's colour — so the old form reaches the same runs by another
 * road. The proof is v0.2.0's own example brief against v0.2.0's own snapshots, kept here
 * byte for byte as v0.2.0 wrote them.
 *
 * One difference is expected and counted: v0.3.0 keeps a price on one line (TYTO-593) by
 * writing the spaces of "R$ 9,8 mil" and "R$ 16 mil" as no-break spaces, which draw and
 * measure as spaces. The HTML is compared with them read back as spaces, and their number is
 * pinned, so nothing else may differ.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(read('../templates/news-da-semana/manifest.yaml'), 'manifest.yaml');
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

/** The no-break spaces each slide's prices get: "R$ 9,8 mil" two, "R$ 16 mil" two. */
const GLUED = [4, 0];

const count = (html: string): number => html.split(NO_BREAK_SPACE).length - 1;

describe('the v0.2.0 example, written the old way', () => {
  it('draws the v0.2.0 snapshots, its prices glued and nothing else changed', async () => {
    const result = await compileTemplate({
      brief: read('./__fixtures__/semana-v0.2.0.brief'),
      template,
      formats,
    });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));

    expect(result.value.frames).toHaveLength(2);
    for (const [index, slide] of result.value.frames.entries()) {
      const before = read(`./__snapshots__/semana-v0.2.0-${index + 1}.html`);
      expect(count(before), `v0.2.0 slide ${index + 1}`).toBe(0);
      expect(count(slide.html), `slide ${index + 1}`).toBe(GLUED[index]);
      expect(slide.html.replaceAll(NO_BREAK_SPACE, ' ')).toBe(before);
    }
  });
});
