export type VisionLayout =
  | "institutional-tabs"
  | "numbered-stepper"
  | "split-index"
  | "expanding-cards"
  | "editorial-underline"
  | "civic-poster"
  | "focused-carousel"
  | "adaptive-columns";

export interface VisionOption {
  id: number;
  slug: string;
  name: string;
  thesis: string;
  tradeoff: string;
  layout: VisionLayout;
}

export interface VisionPillar {
  id: string;
  number: string;
  shortTitle: string;
  title: string;
  body: string;
}

export const visionPillars: VisionPillar[] = [
  {
    id: "excellence",
    number: "01",
    shortTitle: "Excellence",
    title: "First in excellence",
    body: "We pursue ambitious, practical ideas that strengthen academic life and the everyday Carolina experience. Excellence means listening carefully, setting a high standard, and following through on work students can feel.",
  },
  {
    id: "integrity",
    number: "02",
    shortTitle: "Integrity",
    title: "Best in integrity",
    body: "We lead transparently, communicate progress honestly, and hold ourselves accountable to the students we serve. Integrity guides how we make decisions, build partnerships, and earn trust across Carolina.",
  },
  {
    id: "every-student",
    number: "03",
    shortTitle: "Every student",
    title: "For every student",
    body: "We are building a Carolina where every student is seen, supported, and able to belong. Our work starts with the full range of student experiences and makes access, dignity, and opportunity central to every initiative.",
  },
];

export const visionOptions: VisionOption[] = [
  {
    id: 1,
    slug: "institutional-tabs",
    name: "Institutional tabs",
    thesis: "A calm, familiar tab system gives each pillar equal weight and keeps the reading experience immediately understandable.",
    tradeoff: "The safest and most conventional direction; it relies on typography and spacing rather than a dramatic gesture.",
    layout: "institutional-tabs",
  },
  {
    id: 2,
    slug: "numbered-stepper",
    name: "Numbered stepper",
    thesis: "A connected 01–03 sequence makes the three pillars feel like one deliberate administration framework.",
    tradeoff: "The sequence can imply an order even though the pillars are peers.",
    layout: "numbered-stepper",
  },
  {
    id: 3,
    slug: "split-index",
    name: "Split index",
    thesis: "A restrained left-hand index and right-hand statement panel borrow the clarity of an institutional report.",
    tradeoff: "It is especially strong on desktop but becomes a simpler stacked selector on narrow screens.",
    layout: "split-index",
  },
  {
    id: 4,
    slug: "expanding-cards",
    name: "Expanding cards",
    thesis: "Compact cards make the choice tactile, while one selected card receives the visual emphasis and full statement.",
    tradeoff: "More expressive than the formal options and slightly more visually active.",
    layout: "expanding-cards",
  },
  {
    id: 5,
    slug: "editorial-underline",
    name: "Editorial underline",
    thesis: "Large inline pillar names and a precise Carolina Blue underline create a minimal editorial rhythm.",
    tradeoff: "Longer final pillar names would need careful responsive tuning.",
    layout: "editorial-underline",
  },
  {
    id: 6,
    slug: "civic-poster",
    name: "Civic poster",
    thesis: "A compact navy field turns the vision into a confident ProjectBOLD moment without overwhelming the page.",
    tradeoff: "The dark block has more visual weight than the surrounding light sections.",
    layout: "civic-poster",
  },
  {
    id: 7,
    slug: "focused-carousel",
    name: "Focused carousel",
    thesis: "One focused statement with explicit previous and next controls creates the smallest possible footprint.",
    tradeoff: "The other pillar names are less visible until the user advances the control.",
    layout: "focused-carousel",
  },
  {
    id: 8,
    slug: "adaptive-columns",
    name: "Adaptive columns",
    thesis: "Three architectural columns keep the whole framework visible while the selected pillar expands to carry the detail.",
    tradeoff: "The most distinctive direction also has the most complex responsive behavior.",
    layout: "adaptive-columns",
  },
];

export const visionOptionPath = (option: VisionOption) =>
  `/design-options/vision/${String(option.id).padStart(2, "0")}-${option.slug}/`;
