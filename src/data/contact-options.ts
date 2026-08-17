export type ContactOptionLayout =
  | "guided-cards"
  | "split-concierge"
  | "service-map"
  | "conversation-flow"
  | "decision-path"
  | "quick-search"
  | "carolina-carousel"
  | "message-first"
  | "accordion-triage"
  | "contact-desk"
  | "quick-match"
  | "routing-board";

export interface ContactOption {
  id: number;
  slug: string;
  name: string;
  thesis: string;
  tradeoff: string;
  layout: ContactOptionLayout;
}

export const contactOptions: ContactOption[] = [
  {
    id: 1,
    slug: "guided-cards",
    name: "Guided cards",
    thesis: "A calm, one-question-at-a-time route that minimizes decision fatigue and makes the next action unmistakable.",
    tradeoff: "The most approachable path, but students see fewer alternatives at once.",
    layout: "guided-cards",
  },
  {
    id: 2,
    slug: "split-concierge",
    name: "Split concierge",
    thesis: "A stable left-hand pathway menu and live right-hand recommendation let students explore without losing context.",
    tradeoff: "Excellent on wide screens, with a more conventional stacked flow on mobile.",
    layout: "split-concierge",
  },
  {
    id: 3,
    slug: "service-map",
    name: "Service map",
    thesis: "A visible map of common needs helps students understand what the Executive Branch can address before choosing a route.",
    tradeoff: "More transparent and browsable, but denser than a pure guided flow.",
    layout: "service-map",
  },
  {
    id: 4,
    slug: "conversation-flow",
    name: "Conversation flow",
    thesis: "A restrained conversational sequence makes triage feel human without imitating a chatbot or pretending to be a person.",
    tradeoff: "Friendly and focused, though the exchange takes slightly more vertical space.",
    layout: "conversation-flow",
  },
  {
    id: 5,
    slug: "decision-path",
    name: "Decision path",
    thesis: "A visible stepper shows where students are, what they selected, and where their message will go.",
    tradeoff: "Strongest orientation and transparency, with a more procedural feel.",
    layout: "decision-path",
  },
  {
    id: 6,
    slug: "quick-search",
    name: "Quick search",
    thesis: "Students can describe a need in their own words, then choose from matching pathways rather than decoding an org chart.",
    tradeoff: "Fast for confident typists, but still needs the visible pathway fallback for uncertain searches.",
    layout: "quick-search",
  },
  {
    id: 7,
    slug: "carolina-carousel",
    name: "Carolina carousel",
    thesis: "The common reasons become a prominent, swipeable start-here carousel with a focused result panel beneath it.",
    tradeoff: "Inviting and mobile-friendly, but not every pathway is visible simultaneously.",
    layout: "carolina-carousel",
  },
  {
    id: 8,
    slug: "message-first",
    name: "Message first",
    thesis: "The optional writing aid leads the experience while the router quietly identifies the right recipient as context is added.",
    tradeoff: "Best for students ready to write, but less direct for visitors who only need an email address.",
    layout: "message-first",
  },
  {
    id: 9,
    slug: "accordion-triage",
    name: "Accordion triage",
    thesis: "All reasons remain available in a compact expandable list, keeping the page short and easy to scan.",
    tradeoff: "Efficient and familiar, but less visually expressive than the guided options.",
    layout: "accordion-triage",
  },
  {
    id: 10,
    slug: "contact-desk",
    name: "Contact desk",
    thesis: "A practical service-desk layout keeps reasons, topic choices, and the current destination visible in one workspace.",
    tradeoff: "Powerful for comparison, with the highest information density of the set.",
    layout: "contact-desk",
  },
  {
    id: 11,
    slug: "quick-match",
    name: "Quick match",
    thesis: "A compact two-step matcher prioritizes speed and gets most students to a named person in a few seconds.",
    tradeoff: "The shortest route, but offers less explanation before the recommendation.",
    layout: "quick-match",
  },
  {
    id: 12,
    slug: "routing-board",
    name: "Routing board",
    thesis: "A three-column reason-to-topic-to-destination board exposes the full routing logic and supports quick changes.",
    tradeoff: "The clearest system view on desktop, but it simplifies into stacked panels on small screens.",
    layout: "routing-board",
  },
];

export const contactOptionPath = (option: ContactOption) =>
  `/design-options/contact/${String(option.id).padStart(2, "0")}-${option.slug}/`;
