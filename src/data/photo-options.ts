export type PhotoOptionLayout =
  | "editorial-bands"
  | "people-first"
  | "institutional-anchor";

export interface PhotoOption {
  id: number;
  slug: string;
  name: string;
  layout: PhotoOptionLayout;
  thesis: string;
  tradeoff: string;
  heroImage: string;
  heroAlt: string;
  heroFocus: string;
}

export const photoOptions: PhotoOption[] = [
  {
    id: 1,
    slug: "editorial-bands",
    name: "Editorial Bands",
    layout: "editorial-bands",
    thesis: "Keep the established Wilson Library hero and introduce documentary photography as paced editorial breaks between major sections.",
    tradeoff: "The homepage remains familiar, but the administration photographs arrive later in the scroll.",
    heroImage: "/design-lab/wilson-library.jpg",
    heroAlt: "Wilson Library and Polk Place at UNC-Chapel Hill",
    heroFocus: "center 44%",
  },
  {
    id: 2,
    slug: "people-first",
    name: "People First",
    layout: "people-first",
    thesis: "Lead with Student Government at work, then use the oath and South Building as quieter institutional anchors deeper on the page.",
    tradeoff: "The hero feels immediately human and active, with less emphasis on a recognizable campus landmark.",
    heroImage: "/images/photo-lab/student-government-meeting.webp",
    heroAlt: "UNC Student Government leaders meeting with Dr. James Orr in South Building",
    heroFocus: "center 48%",
  },
  {
    id: 3,
    slug: "institutional-anchor",
    name: "Institutional Anchor",
    layout: "institutional-anchor",
    thesis: "Use a close South Building crop and its First and Best for All banners to frame the administration, with people-centered images in the body.",
    tradeoff: "The opening is the most formal of the three, while the human story unfolds after the vision and priorities.",
    heroImage: "/images/photo-lab/south-building.webp",
    heroAlt: "South Building with Carolina 250 and First and Best for All banners",
    heroFocus: "center 58%",
  },
];

export const photoOptionPath = (option: PhotoOption) =>
  `/design-options/photos/${String(option.id).padStart(2, "0")}-${option.slug}/`;
