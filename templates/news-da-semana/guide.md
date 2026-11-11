# How to write a `news-da-semana` brief

`news-da-semana` is the week's news as a 1080×1350 carousel. Every slide repeats the left side
(the logo, the fixed title and a short subtitle) and shows its own news on the right: each
item's label in bold, its text after it. An arrow is drawn on every slide but the last.

Recognise it by the request ("news da semana", "notícias da semana", "resumo da semana") or by
a list of bodies each followed by a short sentence (`Órgão Alfa: edital publicado com 70
vagas…`).

## Slots

| Slot        | Where               | Rule                                                                                                                                    |
| ----------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `lamina`    | directive, repeated | 1 to 10 slides; see Normalisation.                                                                                                      |
| `subtitulo` | directive           | Optional, at most 80 characters: the sentence under the title. Without it: `Segue resumo das` / `principais notícias` / `da semana:`.   |
| `selo`      | frontmatter         | Optional, 1080×140, at the foot of the **last** slide: `selo: ./selo.png`. The bottom corner moves up 140. Only when the person has it. |

The title is fixed: there is no slot for it. Format: `formats: [grid]` only; there is no story.

## Normalisation

Inside each `::lamina`, an item is **`Label: text`**. The **label is what comes before the
first colon** on the line, and the template sets it in bold in the accent by itself. Do not put
`**` around the label. A line break in the brief is a line break on the slide, so there are
two ways, and the reference artwork uses both:

- **label on one line, text below it** (the most common):
  ```
    Órgão Alfa:
    edital publicado com 70 vagas e inicial de R$ 8,2 mil
  ```
- **label and text on the same line**, for items with a long label:
  ```
    Processo seletivo Instituto Gama: autorizadas 40 vagas temporárias
  ```

**Watch colons in the text.** Reading is line by line: a text line with a `:` in its first 40
characters becomes a label (for example `prova: 10/12` on its own line). A time (`10:30`) and a
link do not count. When an item's text has a colon, write it **on the label's line**
(`Tribunal Beta: prova: 10/12`): only the first colon makes the label.

`**…**` is the highlight, for something out of the ordinary in the middle of a text: it comes
out in bold in the accent. The old form `**Label:**` still works; do not use it in a new brief.

`R$ 9,8 mil`, `R$ 16 mil` and `30%` never break in the middle: the template keeps the value
together. Write them normally, with an ordinary space.

No `|`, no bullets, no numbering. A long text wraps by itself at the column's width. There is
no italic.

## How to split into slides

The column holds about **25 lines** per slide (computed from the column's area and line step,
not measured with a real brief). The reference artwork uses **7 to 8 items per slide** (15 to
18 lines): follow that. Split in the copy's order, never cutting an item between slides. If a
slide runs past its area, Tyto warns `W_TEMPLATE_OVERFLOW` and does not shrink the type: move
items to the next slide.

## Example

Copy (invented):

```
News da semana
Órgão Alfa: edital publicado com 70 vagas e inicial de R$ 8,2 mil
Tribunal Beta: edital publicado com iniciais de até R$ 14 mil
Processo seletivo Instituto Gama: autorizadas 40 vagas temporárias
```

Brief:

```brief
---
template: news-da-semana
formats: [grid]
---
::lamina
  Órgão Alfa:
  edital publicado com 70 vagas e inicial de R$ 8,2 mil
  Tribunal Beta:
  edital publicado com iniciais de até R$ 14 mil
  Processo seletivo Instituto Gama: autorizadas 40 vagas temporárias
```

## Known traps

- An item's text with a colon on a line of its own becomes a label (see Normalisation): put it
  on the label's line.
- Up to version 0.2.0 the label needed `**Label:**`. An old brief still draws the same; a new
  brief writes `Label: text`.
