export type TeamOptionLayout =
  | "classic-grid"
  | "sticky-index"
  | "editorial-roster"
  | "accordion-directory"
  | "portrait-mosaic";

export interface TeamOption {
  id: number;
  slug: string;
  name: string;
  thesis: string;
  tradeoff: string;
  layout: TeamOptionLayout;
}

export const teamOptions: TeamOption[] = [
  {
    id: 1,
    slug: "classic-grid",
    name: "Classic grid",
    thesis: "Extends the homepage directory into a familiar portrait-card grid with fuller member details and clear office introductions.",
    tradeoff: "The most immediately familiar option, but it creates the longest page because every team remains open.",
    layout: "classic-grid",
  },
  {
    id: 2,
    slug: "sticky-index",
    name: "Sticky index",
    thesis: "Adds a persistent office index so visitors can jump directly to a team while preserving the established card treatment.",
    tradeoff: "Faster to browse on desktop, though the index becomes a compact horizontal scroller on mobile.",
    layout: "sticky-index",
  },
  {
    id: 3,
    slug: "editorial-roster",
    name: "Editorial roster",
    thesis: "Uses quieter horizontal profiles so more people and biographical details remain visible without making the page feel like a wall of cards.",
    tradeoff: "More information fits on screen, but portraits receive less visual emphasis.",
    layout: "editorial-roster",
  },
  {
    id: 4,
    slug: "accordion-directory",
    name: "Accordion directory",
    thesis: "Uses progressive disclosure by office, keeping the page compact while letting visitors open only the teams they need.",
    tradeoff: "The cleanest initial scan, but individual members are one interaction deeper.",
    layout: "accordion-directory",
  },
  {
    id: 5,
    slug: "portrait-mosaic",
    name: "Portrait mosaic",
    thesis: "Lets visitors select Executive offices, Cabinet departments, or Task forces, then gives each team lead a little more presence within a compact people-first grid.",
    tradeoff: "The strongest visual hierarchy, but only one high-level branch of the directory is shown at a time.",
    layout: "portrait-mosaic",
  },
];

export const teamOptionPath = (option: TeamOption) =>
  `/design-options/team/${String(option.id).padStart(2, "0")}-${option.slug}/`;
