export type RibbonOptionLayout =
  | "split-curtain"
  | "ceremonial-cut"
  | "presidential-letter"
  | "civic-poster"
  | "side-proclamation"
  | "seal-reveal"
  | "ribbon-canopy"
  | "threshold-portal"
  | "editorial-stage"
  | "minimal-ribbon";

export interface RibbonOption {
  id: number;
  slug: string;
  name: string;
  thesis: string;
  tradeoff: string;
  layout: RibbonOptionLayout;
}

export const ribbonOptions: RibbonOption[] = [
  {
    id: 1,
    slug: "split-curtain",
    name: "Split curtain",
    thesis: "Two Carolina-blue ribbon fields part like ceremonial curtains before settling around a calm centered welcome letter.",
    tradeoff: "The clearest ribbon-cutting metaphor, with the most theatrical opening motion.",
    layout: "split-curtain",
  },
  {
    id: 2,
    slug: "ceremonial-cut",
    name: "Ceremonial cut",
    thesis: "A single ribbon stretches across the screen and visibly separates at center, making the launch moment immediate and unmistakable.",
    tradeoff: "Fast and playful, but the cut animation carries more visual energy than the reading state.",
    layout: "ceremonial-cut",
  },
  {
    id: 3,
    slug: "presidential-letter",
    name: "Presidential letter",
    thesis: "The message leads as an official letter, with the ribbon and confetti acting as a celebratory frame rather than the main event.",
    tradeoff: "Best reading experience and institutional tone, with a quieter ribbon-cutting moment.",
    layout: "presidential-letter",
  },
  {
    id: 4,
    slug: "civic-poster",
    name: "Civic poster",
    thesis: "A bold navy launch poster presents the welcome as a public statement, then opens to reveal the full letter beside it.",
    tradeoff: "Strongest ProjectBOLD energy, with a denser desktop composition.",
    layout: "civic-poster",
  },
  {
    id: 5,
    slug: "side-proclamation",
    name: "Side proclamation",
    thesis: "A sculptural ribbon occupies one side while a formal proclamation panel carries the message in a spacious reading column.",
    tradeoff: "Distinctive and balanced on wide screens; the ribbon becomes a compact header on mobile.",
    layout: "side-proclamation",
  },
  {
    id: 6,
    slug: "seal-reveal",
    name: "Seal reveal",
    thesis: "Concentric ribbon rings open like a civic seal, introducing the message with a ceremonial, administration-forward identity.",
    tradeoff: "Most symbolic option, with less literal resemblance to a traditional ribbon cutting.",
    layout: "seal-reveal",
  },
  {
    id: 7,
    slug: "ribbon-canopy",
    name: "Ribbon canopy",
    thesis: "An overhead canopy of ribbons and confetti frames a low, welcoming message sheet that feels like stepping into an event space.",
    tradeoff: "Warm and mobile-friendly, though more celebratory than formal.",
    layout: "ribbon-canopy",
  },
  {
    id: 8,
    slug: "threshold-portal",
    name: "Threshold portal",
    thesis: "The homepage remains visible through an arched front-door opening while a ribbon crosses the threshold and parts on arrival.",
    tradeoff: "Connects directly to the front-door language, but intentionally shows less of the underlying page until dismissal.",
    layout: "threshold-portal",
  },
  {
    id: 9,
    slug: "editorial-stage",
    name: "Editorial stage",
    thesis: "A numbered editorial composition treats the launch as the first public note from the new administration, with ribbon accents marking the reading path.",
    tradeoff: "Sophisticated and content-led, with a subtler celebratory cue.",
    layout: "editorial-stage",
  },
  {
    id: 10,
    slug: "minimal-ribbon",
    name: "Minimal ribbon",
    thesis: "A restrained white dialog and one crisp Carolina-blue ribbon deliver a polished welcome without obscuring the institutional website beneath it.",
    tradeoff: "Most production-safe and accessible, but least theatrical of the ten.",
    layout: "minimal-ribbon",
  },
];

export const ribbonOptionPath = (option: RibbonOption) =>
  `/design-options/ribbon/${String(option.id).padStart(2, "0")}-${option.slug}/`;
