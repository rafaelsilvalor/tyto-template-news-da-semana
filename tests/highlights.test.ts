import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { solid } from '@tyto/core/template';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, build } from '../src/template.js';

import type { Frame, SceneNode, TextNode } from '@tyto/core';

/**
 * The highlights a brief writes, as anuncio has them (TYTO-895): `**…**` Bold in `destaque` in the
 * news and in the subtitle, and in the subtitle a `{cor:destaque|destaque-2|destaque-3}` mark that
 * changes the colour only. Each colour is set in the brief's frontmatter (Tyto ADR 0226).
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(read('../templates/news-da-semana/manifest.yaml'), 'manifest.yaml');
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

async function slide(frontmatter: string, body: string): Promise<Frame> {
  const result = await compileTemplate({
    brief: `---\ntemplate: news-da-semana\nformats: [grid]\n${frontmatter}---\n${body}`,
    template,
    formats,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.scene.artworks[0]!.frames[0]!;
}

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

/** The text run of `name` that reads `words`, as [weight, colour]. */
function runOf(frame: Frame, name: string, words: string): [number, unknown] {
  const node = nodes(frame).find(
    (each): each is TextNode => each.kind === 'text' && each.name === name,
  );
  const found = node?.runs.find((piece) => piece.kind === 'text' && piece.text === words);
  if (found?.kind !== 'text') throw new Error(`no run '${words}' in ${name}`);
  return [found.weight, found.color];
}

const NEWS = '::lamina\n  Corex: edital **urgente** hoje\n';
const HEADER = (words: string) => `::subtitulo\n  ${words}\n\n`;

describe('the highlights', () => {
  it('paint `**…**` Bold in the default destaque, in the news and in the subtitle', async () => {
    const frame = await slide('', HEADER('Resumo **da** semana') + NEWS);

    expect(COLOR_DEFAULTS.destaque).toBe(COLOR_DEFAULTS['label-ink']);
    expect(runOf(frame, 'noticias', 'urgente')).toEqual([700, solid(COLOR_DEFAULTS.destaque)]);
    expect(runOf(frame, 'subtitulo', 'da')).toEqual([700, solid(COLOR_DEFAULTS.destaque)]);
  });

  it('paint `**…**` in the destaque a brief sets, and leave the label its own colour', async () => {
    const frame = await slide("destaque: '#123456'\n", HEADER('Resumo **da** semana') + NEWS);

    expect(runOf(frame, 'noticias', 'urgente')).toEqual([700, solid('#123456')]);
    expect(runOf(frame, 'subtitulo', 'da')).toEqual([700, solid('#123456')]);
    expect(runOf(frame, 'noticias', 'Corex:')).toEqual([700, solid(COLOR_DEFAULTS['label-ink'])]);
  });

  it('paint a subtitle `{cor:destaque-2}` in the colour the brief sets, its weight kept', async () => {
    const frame = await slide(
      "destaque-2: '#abcdef'\n",
      HEADER('Resumo {cor:destaque-2}da{/} semana') + NEWS,
    );

    expect(runOf(frame, 'subtitulo', 'da')).toEqual([700, solid('#abcdef')]);
    expect(runOf(frame, 'subtitulo', 'Resumo ')).toEqual([
      700,
      solid(COLOR_DEFAULTS['subtitle-ink']),
    ]);
  });

  it('leave words under a mark the template does not declare as they are', async () => {
    const frame = await slide(
      "destaque-2: '#abcdef'\n",
      HEADER('Resumo {cor:azul}da{/} semana') +
        '::lamina\n  Corex: edital {cor:destaque-2}urgente{/} hoje\n',
    );

    // Nothing changes the marked words, so they join the words around them in one run.
    expect(runOf(frame, 'subtitulo', 'Resumo da semana')).toEqual([
      700,
      solid(COLOR_DEFAULTS['subtitle-ink']),
    ]);
    // The news take `**…**` alone: a colour mark there names nothing.
    expect(runOf(frame, 'noticias', ' edital urgente hoje')).toEqual([
      300,
      solid(COLOR_DEFAULTS['body-ink']),
    ]);
  });
});
