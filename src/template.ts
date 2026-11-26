/**
 * `news-da-semana` — the week's news as a carousel of 1080×1350 slides.
 *
 * Every slide is the same page: on the left the logo, the words "News da semana" and a line
 * that introduces the list; on the right the slide's news, one `Label: words` after the other,
 * centred on the page's height. One `::lamina` is one slide.
 *
 * Every element is a piece of `@tyto/template-kit` or `@tyto/house-style` (Tyto ADR 0230): text
 * placed by the top of its capitals is the kit's `capText`, the marks are its shapes. What stays
 * here is the wiring and the reference art's coordinates as data (the maintainer's PSD, in the
 * slide's pixels): a text is placed by the top of its capitals, as the reference's layer bounds
 * give it. The logo is the brand kit's (Tyto ADR 0063), a placeholder without one; every colour
 * is a declared value (Tyto ADR 0153) whose default is the reference's.
 */

import { colorValue, frame, lineBreak, runsOf, solid } from '@tyto/core/template';
import { drawLogo, sealOf } from '@tyto/house-style';
import {
  anchorOf,
  arrowShape,
  at,
  atLeastOne,
  capText,
  cornerBracket,
  keepTogether,
  labelOf,
  mark,
  plain,
  plainRuns,
  reportOverflow,
  rule,
  sealed,
  slideRichLines,
  slotText,
} from '@tyto/template-kit';

import type { RichText, TemplateBuild, TemplateContext } from '@tyto/core';
import type { NodeDraft } from '@tyto/core/template';
import type { Block, CapTextParameters, CornerBracketParameters, Mark } from '@tyto/template-kit';

/* -------------------------------------------------------------------------- the words -- */

/**
 * The words over the list, one text a line as the reference sets them: each line's `x` puts
 * its first letter's ink on the reference's left edge, 111 px, whatever that letter's bearing.
 */
const TITLE = [
  { words: 'NEWS', x: 106, capTop: 516 },
  { words: 'DA', x: 106, capTop: 608 },
  { words: 'SEMANA', x: 109, capTop: 699 },
] as const;

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
  /** A news item's label, what comes before its first `:`, and its `**highlighted**` words. */
  'label-ink': '#460292',
  /** A news item's other words. */
  'body-ink': '#646464',
  /** The line under the title. */
  'subtitle-ink': '#8c8c8c',
  /** The small spaced words at the top. */
  'overline-ink': '#828282',
  /** The logo's two tones, as the reference draws the owl: the kit's primary, then its secondary. */
  logo: '#4c2fa6',
  'logo-shade': '#7460ef',
  /** The two thin diagonals. */
  'rule-ink': '#8f8f8f',
  /** The page's corner marks. */
  'corner-ink': '#585858',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;
type Ink = (name: ColorName) => string;

const FACE = { family: 'CircularXX', source: 'system' } as const;
const LIGHT = 300;
const REGULAR = 400;
const BOLD = 700;

const SLIDE_WIDTH = 1080;
/** A glyph's advance, in em, for when nothing can be measured (a test, CI without the face). */
const ESTIMATED_ADVANCE = 0.5;

/** The list of news, the reference's: its column, its type and the height it is centred on. */
export const NEWS = {
  x: 445,
  width: 518,
  size: 23.97,
  /** From one line's capitals to the next's, 40.45 px in the reference. */
  lineHeight: 40.45 / 23.97,
  /** The list's middle, from its first capitals to its last baseline, on both reference slides. */
  centre: 671,
  /** The list may not start over this, nor end under the bottom one. */
  top: 160,
  bottom: 1190,
} as const;

/* ------------------------------------------------------------------------- the places -- */

/** The small spaced words, centred across the slide. */
const OVERLINE_TYPE = { size: 12.7, align: 'center', letterSpacing: 25.7 } as const;
const OVERLINE_PLACE = { x: 0, capTop: 87, width: SLIDE_WIDTH } as const;
const TITLE_TYPE = { size: 70.3 } as const;
const SUBTITLE_TYPE = { size: 30, lineHeight: 36.5 / 30 } as const;
const SUBTITLE_PLACE = { x: 115, capTop: 899, width: 300 } as const;
const LOGO = { x: 113, y: 353, height: 88 } as const;

/** The two thin diagonals, the reference's: one by the logo, one under "Semana". */
const DIAGONALS = [
  { name: 'diagonal-logo', x: 44, y: 445, length: 54 },
  { name: 'diagonal-titulo', x: 354, y: 765, length: 60 },
] as const;

/** The page's corner marks: top left under the top line, bottom right over the arrow. */
const CORNERS: readonly {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly corner: CornerBracketParameters['corner'];
  /** Whether the seal's band lifts it. */
  readonly lifts: boolean;
}[] = [
  { name: 'canto-superior', x: 112, y: 135, corner: 'top-left', lifts: false },
  { name: 'canto-inferior', x: 955, y: 1201, corner: 'bottom-right', lifts: true },
];
const CORNER_SIZE = 14;

/** The small mark over the subtitle: a filled square resting on an outlined one. */
const SQUARES: Mark = {
  box: { w: 19, h: 20 },
  d: 'M10 0H19V10H11V20H0V9H10Z M1 10V19H9V10Z',
  fillRule: 'evenodd',
};
const SQUARES_PLACE = { x: 112, y: 813 } as const;

/** The arrow pointing to the next slide, its head the kit's default 0.64 of its height long. */
const ARROW = { x: 894, y: 1258, w: 106, h: 35 } as const;

/* --------------------------------------------------------------------------- the build -- */

export const build: TemplateBuild = (context: TemplateContext) => {
  const ink: Ink = (name) => colorValue(context, name, COLOR_DEFAULTS[name]);
  // The house's seal, the brief's `selo`, glued to the last slide's foot (TYTO-201): the
  // bottom corner and the list's room rise by its band.
  const page = sealed(context.size, sealOf(context));
  const lift = context.size.h - page.size.h;
  const style = (weight: number, color: ColorName, size: number) => ({
    font: FACE,
    size,
    weight,
    color: ink(color),
  });
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: solid(ink('paper')),
    children: [
      byCapitals(
        OVERLINE_PLACE,
        capText(
          plainRuns(OVERLINE, style(REGULAR, 'overline-ink', OVERLINE_TYPE.size)),
          { width: OVERLINE_PLACE.width, height: Infinity },
          OVERLINE_TYPE,
          { name: 'sobretitulo' },
        ),
      ),
      ...TITLE.map((line) =>
        byCapitals(
          line,
          capText(
            plainRuns(line.words, style(BOLD, 'title-ink', TITLE_TYPE.size)),
            { width: Infinity, height: Infinity },
            TITLE_TYPE,
            { name: 'titulo' },
          ),
        ),
      ),
      byCapitals(
        SUBTITLE_PLACE,
        capText(
          plainRuns(
            slotText(context, 'subtitulo', DEFAULT_SUBTITLE),
            style(BOLD, 'subtitle-ink', SUBTITLE_TYPE.size),
          ),
          { width: SUBTITLE_PLACE.width, height: Infinity },
          SUBTITLE_TYPE,
          { name: 'subtitulo' },
        ),
      ),
      news(context, ink, lift),
      at(
        LOGO.x,
        LOGO.y,
        drawLogo(context.brand, LOGO.height, {
          primary: ink('logo'),
          secondary: ink('logo-shade'),
        }),
      ),
      ...DIAGONALS.map((diagonal) =>
        at(
          diagonal.x,
          diagonal.y,
          rule(
            diagonal.length,
            solid(ink('rule-ink')),
            { direction: 'diagonal-down', thickness: 1 },
            { name: diagonal.name },
          ),
        ),
      ),
      ...CORNERS.map((corner) =>
        at(
          corner.x,
          corner.y - (corner.lifts ? lift : 0),
          cornerBracket(
            CORNER_SIZE,
            solid(ink('corner-ink')),
            { corner: corner.corner },
            { name: corner.name },
          ),
        ),
      ),
      at(
        SQUARES_PLACE.x,
        SQUARES_PLACE.y,
        mark(SQUARES, SQUARES.box.h, ink('subtitle-ink'), 'quadrados'),
      ),
      ...(context.artwork.index === context.artwork.count - 1
        ? []
        : [
            at(
              ARROW.x,
              ARROW.y,
              arrowShape({ w: ARROW.w, h: ARROW.h }, solid(ink('title-ink')), {}, { name: 'seta' }),
            ),
          ]),
      ...page.seal,
    ],
  });
};

/** A text block placed so that its capitals start at `capTop`. */
function byCapitals(place: { readonly x: number; readonly capTop: number }, words: Block) {
  return at(place.x, place.capTop - anchorOf(words).capTop, words);
}

/* ---------------------------------------------------------------------------- the news -- */

/**
 * The slide's news as one text: each written line a line, its label — what comes before its
 * first `:`, the house convention (TYTO-594) — Bold in the label's colour and the rest Light,
 * centred on the reference's middle and reported when it overruns its room.
 *
 * `**…**` is the house's highlight wherever it is written, Bold in the label's colour as well:
 * so a line written the v0.2.0 way, `**Label:** words`, draws what it drew then. A price never
 * splits from its sign or its scale word (TYTO-593): "R$ 9,8 mil" keeps one line.
 */
function news(context: TemplateContext, ink: Ink, lift: number): NodeDraft {
  const written = slideRichLines(context);
  const body = { font: FACE, size: NEWS.size, weight: LIGHT, color: ink('body-ink') };
  const runs = written.flatMap((line, index) => {
    const { label, text: words } = labelOf(keepTogether(line));
    return [
      ...(index > 0 ? [lineBreak()] : []),
      ...[
        ...(label === undefined ? [] : runsOf(label, { ...body, weight: BOLD }, { bold: BOLD })),
        ...runsOf(words, body, { bold: BOLD }),
      ].map((item) =>
        item.kind === 'text' && item.weight === BOLD
          ? { ...item, color: solid(ink('label-ink')) }
          : item,
      ),
    ];
  });
  // A slide with no news still draws one empty text, as it always has.
  const drawn =
    atLeastOne(runs) ??
    plainRuns('', { font: FACE, size: NEWS.size, weight: REGULAR, color: '#000000' });
  const type: Partial<CapTextParameters> = { size: NEWS.size, lineHeight: NEWS.lineHeight };
  const area = { width: NEWS.width, height: Infinity };
  const probe = capText(drawn, area, type, { name: 'noticias' }).draft;
  const measured = probe.kind === 'text' ? context.measure(probe)?.lines : undefined;
  const lines = Math.max(1, measured ?? estimatedLines(written));
  const list = capText(drawn, area, type, { name: 'noticias', lines });
  const anchor = anchorOf(list);
  const height = anchor.baseline - anchor.capTop;
  const capTop = Math.max(NEWS.top, NEWS.centre - height / 2);
  reportOverflow(context.report, capTop + height, NEWS.bottom - lift);
  return at(NEWS.x, capTop - anchor.capTop, list);
}

/**
 * Pending TYTO-905: how many lines the news wrap to when nothing can measure them, from the
 * characters a line of the column holds, each written line counted apart. It goes when the
 * kit's `capText` estimates by width itself.
 */
function estimatedLines(written: readonly RichText[]): number {
  const perLine = Math.max(1, Math.floor(NEWS.width / (NEWS.size * ESTIMATED_ADVANCE)));
  return written.reduce<number>(
    (sum, line) => sum + Math.max(1, Math.ceil([...plain(line)].length / perLine)),
    0,
  );
}
