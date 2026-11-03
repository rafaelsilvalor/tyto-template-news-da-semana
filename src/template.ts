/**
 * `news-da-semana` — the week's news as a carousel of 1080×1350 slides.
 *
 * Every slide is the same page: on the left the logo, the words "News da semana" and a line
 * that introduces the list; on the right the slide's news, one `**Label:** words` after the
 * other, centred on the page's height. One `::lamina` is one slide.
 *
 * Every position is the reference art's (the maintainer's PSD), in the slide's pixels: a text
 * is placed by the top of its capitals, as the reference's layer bounds give it. The logo is
 * the brand kit's (Tyto ADR 0063), a placeholder without one; every colour is a declared value
 * (Tyto ADR 0153) whose default is the reference's.
 */

import { colorValue, lineBreak, run, runsOf, solid, text, frame } from '@tyto/core/template';
import { lines, plain, reportOverflow } from '@tyto/template-kit';

import type { RichText, TemplateBuild, TemplateContext, TextRun } from '@tyto/core';
import type { NodeDraft, TextDraft } from '@tyto/core/template';

/* -------------------------------------------------------------------------- the words -- */

/** The words over the list, in three lines, as the reference sets them. */
const TITLE = 'NEWS\nDA\nSEMANA';

/** The small spaced words at every slide's top. */
const OVERLINE = 'NEWS DA SEMANA';

/** The line under the title when the brief writes no `subtitulo`. */
export const DEFAULT_SUBTITLE = 'Segue resumo das\nprincipais notícias\nda semana:';

/* ------------------------------------------------------------------------- the tokens -- */

/** The colours a configuration may change, by declared value name, each the reference's. */
export const COLOR_DEFAULTS = {
  paper: '#ffffff',
  /** "News da semana" in large. */
  'title-ink': '#4d02a1',
  /** A news item's label, its `**bold**` words. */
  'label-ink': '#460292',
  /** A news item's other words. */
  'body-ink': '#646464',
  /** The line under the title. */
  'subtitle-ink': '#8c8c8c',
  /** The small spaced words at the top. */
  'overline-ink': '#828282',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;
type Ink = (name: ColorName) => string;

const FACE = { family: 'CircularXX', source: 'system' } as const;
const LIGHT = 300;
const REGULAR = 400;
const BOLD = 700;

/**
 * CircularXX's vertical metrics, in em, from its `OS/2` table and the same in every weight: a
 * line of height `lineHeight` puts the content area in its middle, so the capitals start this
 * far below the line's top (measured on concursos-abertos against its reference art).
 */
const ASCENT = 0.75;
const DESCENT = 0.25;
const CAP_HEIGHT = 0.709;

function capOffset(size: number, lineHeight: number): number {
  return size * ((lineHeight - (ASCENT + DESCENT)) / 2 + (ASCENT - CAP_HEIGHT));
}

const SLIDE_WIDTH = 1080;
/** A glyph's advance, in em, for when nothing can be measured (a test, CI without the face). */
const ESTIMATED_ADVANCE = 0.5;

/** The list of news, the reference's: its column, its type and the height it is centred on. */
export const NEWS = {
  x: 445,
  width: 511,
  size: 23.97,
  /** From one line's capitals to the next's, 40.45 px in the reference. */
  lineHeight: 40.45 / 23.97,
  /** The list's middle, from its first capitals to its last baseline, on both reference slides. */
  centre: 671,
  /** The list may not start over this, nor end under the bottom one. */
  top: 160,
  bottom: 1190,
} as const;

/* --------------------------------------------------------------------------- the build -- */

export const build: TemplateBuild = (context: TemplateContext) => {
  const ink: Ink = (name) => colorValue(context, name, COLOR_DEFAULTS[name]);
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: solid(ink('paper')),
    children: [
      textAt('sobretitulo', OVERLINE, {
        x: 0,
        capTop: 87,
        size: 12.7,
        weight: REGULAR,
        color: ink('overline-ink'),
        width: SLIDE_WIDTH,
        align: 'center',
        letterSpacing: 35,
      }),
      textAt('titulo', TITLE, {
        x: 111,
        capTop: 515,
        size: 69.64,
        weight: BOLD,
        color: ink('title-ink'),
        lineHeight: 91.5 / 69.64,
      }),
      textAt('subtitulo', slotText(context, 'subtitulo', DEFAULT_SUBTITLE), {
        x: 115,
        capTop: 899,
        size: 30,
        weight: BOLD,
        color: ink('subtitle-ink'),
        lineHeight: 36.5 / 30,
        width: 300,
      }),
      news(context, ink),
    ],
  });
};

/* ---------------------------------------------------------------------------- the news -- */

/**
 * The slide's news as one text: each written line a line, `**bold**` in the label's colour and
 * the rest Light, centred on the reference's middle and reported when it overruns its room.
 */
function news(context: TemplateContext, ink: Ink): NodeDraft {
  const written = slideRichLines(context);
  const body = { font: FACE, size: NEWS.size, weight: LIGHT, color: ink('body-ink') };
  const runs = written.flatMap((line, index) => [
    ...(index > 0 ? [lineBreak()] : []),
    ...runsOf(line, body, { bold: BOLD }).map((item) =>
      item.kind === 'text' && item.weight === BOLD
        ? { ...item, color: solid(ink('label-ink')) }
        : item,
    ),
  ]);
  const box = { x: NEWS.x, size: NEWS.size, lineHeight: NEWS.lineHeight, width: NEWS.width };
  const draft = textRuns('noticias', runs, { ...box, capTop: 0 });
  const count = lineCount(context, draft, written, NEWS.size, NEWS.width);
  const pitch = NEWS.size * NEWS.lineHeight;
  const height = (count - 1) * pitch + NEWS.size * CAP_HEIGHT;
  const capTop = Math.max(NEWS.top, NEWS.centre - height / 2);
  reportOverflow(context.report, capTop + height, NEWS.bottom);
  return textRuns('noticias', runs, { ...box, capTop });
}

/* -------------------------------------------------------------------------- the shared -- */

interface Box {
  readonly x: number;
  /** Where the capitals start, in the slide's pixels. */
  readonly capTop: number;
  readonly lineHeight?: number;
  readonly width?: number;
  readonly align?: 'left' | 'center';
  readonly letterSpacing?: number;
}

interface Placed extends Box {
  readonly size: number;
  readonly weight: number;
  readonly color: string;
}

/** A plain text, one run per line, placed by the top of its capitals. */
function textAt(name: string, words: string, placed: Placed): TextDraft {
  const style = { font: FACE, size: placed.size, weight: placed.weight, color: placed.color };
  const [first = '', ...others] = words.split('\n');
  return textRuns(
    name,
    [run(first, style), ...others.flatMap((line) => [lineBreak(), run(line, style)])],
    placed,
  );
}

function textRuns(
  name: string,
  runs: readonly TextRun[],
  placed: Box & { readonly size: number },
): TextDraft {
  const lineHeight = placed.lineHeight ?? 1;
  const [head, ...tail] = runs;
  const empty = run('', { font: FACE, size: placed.size, weight: REGULAR, color: '#000000' });
  return text({
    name,
    runs: [head ?? empty, ...tail],
    ...(placed.width === undefined ? {} : { box: { w: placed.width } }),
    align: placed.align ?? 'left',
    lineHeight,
    letterSpacing: placed.letterSpacing ?? 0,
    transform: { x: placed.x, y: placed.capTop - capOffset(placed.size, lineHeight) },
  });
}

/**
 * How many lines a text wraps to: measured when the context can, estimated otherwise from the
 * characters a line of `width` holds, each line written counted apart.
 */
function lineCount(
  context: TemplateContext,
  node: NodeDraft,
  written: readonly RichText[],
  size: number,
  width: number,
): number {
  const measured = node.kind === 'text' ? context.measure(node) : undefined;
  if (measured !== undefined) return Math.max(1, measured.lines);
  const perLine = Math.max(1, Math.floor(width / (size * ESTIMATED_ADVANCE)));
  const count = written.reduce<number>((sum, line) => {
    const characters = [...plain(line)].length;
    return sum + Math.max(1, Math.ceil(characters / perLine));
  }, 0);
  return Math.max(1, count);
}

/** This slide's written lines as rich text, the empty ones dropped. */
function slideRichLines(context: TemplateContext): RichText[] {
  const value = context.slots['lamina']?.value;
  if (value?.kind !== 'rich-text') return [];
  return lines(value.text).filter((line) => plain(line).trim() !== '');
}

/** A rich-text slot's words as plain text, or the template's default when the brief left it out. */
function slotText(context: TemplateContext, name: string, fallback: string): string {
  const value = context.slots[name]?.value;
  if (value?.kind !== 'rich-text') return fallback;
  const words = plain(value.text).trim();
  return words === '' ? fallback : words;
}
