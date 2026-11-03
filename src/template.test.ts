import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SUBTITLE, NEWS, build } from './template.js';

import type { AssetResolver, Frame, SceneNode, TextNode } from '@tyto/core';

/**
 * The carousel's rules, asserted on the scene: one slide per `::lamina`, what each slide
 * draws, the words the brief replaces, and that every text starts inside its slide. Never a
 * pixel size: CI has no CircularXX, and positions are the reference's, checked against the
 * reference art outside this repository.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(read('../templates/news-da-semana/manifest.yaml'), 'manifest.yaml');
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });
const example = read('../templates/news-da-semana/examples/semana.brief');

/** Any image the brief names is found; no file is read. */
const anyImage: AssetResolver = {
  base: '.',
  resolve: (reference) =>
    Promise.resolve({ id: reference, source: 'file', path: reference, hash: reference }),
};

async function compiled(brief: string) {
  const result = await compileTemplate({
    brief: brief.startsWith('---')
      ? brief
      : `---\ntemplate: news-da-semana\nformats: [grid]\n---\n${brief}`,
    template,
    formats,
    assets: anyImage,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result;
}

async function slides(brief = example): Promise<Frame[]> {
  const result = await compiled(brief);
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
}

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

const texts = (slide: Frame): TextNode[] =>
  nodes(slide).filter((node): node is TextNode => node.kind === 'text');

const named = (slide: Frame, name: string): TextNode | undefined =>
  texts(slide).find((node) => node.name === name);

const words = (node: TextNode | undefined): string =>
  (node?.runs ?? []).map((piece) => (piece.kind === 'text' ? piece.text : '\n')).join('');

describe('news-da-semana', () => {
  it('declares the grid only, as the reference art', () => {
    expect(manifest.value.formats).toEqual(['grid']);
  });

  it('draws one 1080×1350 slide per ::lamina, each with the title and its own news', async () => {
    const drawn = await slides();

    expect(drawn).toHaveLength(2);
    expect(drawn.map((slide) => slide.size)).toEqual(Array(2).fill({ w: 1080, h: 1350 }));
    const title = (slide: Frame) =>
      texts(slide)
        .filter((node) => node.name === 'titulo')
        .map(words)
        .join('\n');
    expect(drawn.map(title)).toEqual(Array(2).fill('NEWS\nDA\nSEMANA'));
    expect(words(named(drawn[0]!, 'noticias'))).toContain('QCX Norte:');
    expect(words(named(drawn[1]!, 'noticias'))).toContain('Bombeiro XY:');
  });

  it("sets a news item's bold label Bold and its other words Light", async () => {
    const [slide] = await slides('::lamina\n  **Corex:** edital publicado');
    const runs = named(slide!, 'noticias')!.runs.filter((piece) => piece.kind === 'text');

    expect(runs.map((piece) => [piece.text, piece.weight])).toEqual([
      ['Corex:', 700],
      [' edital publicado', 300],
    ]);
  });

  it("draws the reference subtitle by default, and the brief's when it writes one", async () => {
    const [plain] = await slides('::lamina\n  **Corex:** edital');
    const [written] = await slides(
      '::subtitulo\n  Resumo do mês:\n\n::lamina\n  **Corex:** edital',
    );

    expect(words(named(plain!, 'subtitulo'))).toBe(DEFAULT_SUBTITLE);
    expect(words(named(written!, 'subtitulo'))).toBe('Resumo do mês:');
  });

  it('starts every text inside its slide', async () => {
    for (const slide of await slides()) {
      for (const node of texts(slide)) {
        expect(node.transform.x, node.name).toBeGreaterThanOrEqual(0);
        expect(node.transform.y, node.name).toBeGreaterThanOrEqual(0);
        expect(node.transform.x, node.name).toBeLessThan(1080);
        expect(node.transform.y, node.name).toBeLessThan(1350);
      }
    }
  });

  it('centres a short list lower than a long one, and never starts it over its top', async () => {
    const [short] = await slides('::lamina\n  **Corex:** edital');
    const long = `::lamina\n${Array(60).fill('  **Corex:** edital publicado').join('\n')}`;
    const [tall] = await slides(long);

    const top = (slide: Frame) => named(slide, 'noticias')!.transform.y;
    expect(top(short!)).toBeGreaterThan(top(tall!));
    expect(top(tall!)).toBeGreaterThan(NEWS.top - NEWS.size * 2);
  });

  it('reports a list that runs past its room, and none for the example', async () => {
    const long = `::lamina\n${Array(60).fill('  **Corex:** edital publicado').join('\n')}`;
    const overflow = (result: Awaited<ReturnType<typeof compiled>>) =>
      result.diagnostics.filter((item) => item.code === 'W_TEMPLATE_OVERFLOW');

    expect(overflow(await compiled(long))).toHaveLength(1);
    expect(overflow(await compiled(example))).toHaveLength(0);
  });
});

describe('the seal', () => {
  const sealedBrief = example.replace('formats: [grid]\n', 'formats: [grid]\nselo: ./selo.png\n');

  it("glues the brief's selo to the last slide's foot only, and lifts the bottom corner", async () => {
    const plain = await slides();
    const drawn = await slides(sealedBrief);
    const seals = (slide: Frame) => nodes(slide).filter((node) => node.name === 'seal');
    const corner = (slide: Frame) =>
      nodes(slide).find((node) => node.name === 'canto-inferior')!.transform.y;

    expect(drawn.map((slide) => seals(slide).length)).toEqual([0, 1]);
    expect(corner(drawn[0]!)).toBe(corner(plain[0]!));
    expect(corner(drawn[1]!)).toBe(corner(plain[1]!) - 140);
  });
});
