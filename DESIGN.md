# DESIGN.md - Duncan Administration Executive Branch

## Context (from discovery)

- Artifact type: public-service landing page and institutional brand hub.
- Positioning: civic, design-forward, and accountable without campaign-election language.
- Audience: UNC undergraduate students. Primary action: find help quickly and understand what the administration is doing.
- Adjectives: bold, civic, optimistic, accountable, Carolina.
- Visual word translations: bold -> oversized Anton statements and decisive blocks; civic -> public-information hierarchy and Old Well geometry; optimistic -> Carolina blue fields and warm yellow highlights; accountable -> visible status, records, and plain-language updates; Carolina -> documentary campus imagery and the canonical UNC utility bar.
- Aesthetic essence: bold, civic, useful.
- Single-minded proposition: this administration is present, organized, and working for students.
- Archetype: Everyman with Hero energy.
- References: ProjectBOLD brand guide for palette and motifs; ProjectBOLD campaign site for marker-like highlights and energetic section changes; Alvarez administration site for information architecture only. Avoid generic startup cards and political-campaign donation language.
- Mode: light and navy surfaces within one page. Density: balanced, with airy storytelling and compact service navigation.
- Constraints: Astro static output; Anton and Montserrat only; WCAG 2.2 AA; official UNC hosted utility bar; CloudApps/OpenShift static nginx contract; design lab must remain isolated from the production route.

## Aesthetic

- Direction: Carolina civic poster system.
- Defining trait: flat high-contrast fields organized by strong typographic alignment rather than ornamental cards.
- Signature move: a slightly offset Carolina-blue shadow behind a gold or yellow block carrying navy display text.

### Refined institutional mode

- Personality: authoritative, clear, human, and Carolina-specific; not campaign-like, loud, ornamental, or corporate.
- Hierarchy: student task or public work first, supporting context second, and administration branding third.
- Use Anton only for concise hero statements and high-value numerals. Montserrat carries section headings, body copy, navigation, and records.
- Omit eyebrow text. Section meaning must be clear from the heading, content, and position rather than small uppercase labels.
- Lead with authentic campus and administration photography. Prefer candid activity, visible collaboration, wide landmark crops, and approachable portraits.
- Images may be full-bleed, split flush with content, or used as a section background. Do not frame campus photographs with decorative borders or offset shadows.
- A softly curved lower hero edge is an approved recurring treatment, not a universal requirement. Keep the curve shallow enough to preserve crop and reading space.
- Keep ProjectBOLD language attached to the policy platform and progress reporting. Do not repeat “bold” as generic decorative copy.
- Use the official Student Government mark quietly with live text identifying the Executive Branch and Duncan Administration.
- Utility bars may use any of UNC ITS's six approved options: gray, dark gray, black, navy, blue, or white. Never modify their internal typography, links, spacing, or behavior.

## Typography

- Display: Anton 400 | source: Fontsource/Google Fonts | license: OFL-1.1.
- Body: Montserrat Variable 400-800 | source: Fontsource/Google Fonts | license: OFL-1.1.
- Scale: ratio 1.25 Major Third, base 16px. Display 64-144px/0.9 for hero statements; h1 52-96px/0.94; h2 36-60px/1; h3 22-30px/1.15; body 16-20px/1.6; small 13-14px/1.5.
- Weights: display 400; body 400-500; controls 650-750; labels 750-800. Measure: 60ch for prose. Short labels use 0.08em to 0.14em positive tracking.

## Color

- Strategy: navy carries institutional trust, Carolina blue carries optimism, and gold provides a deliberately small focal counterpoint. Campaign blue is reserved for links, focus-adjacent states, and secondary actions. Orange and magenta appear only in rare high-energy editorial moments.
- Distribution: 60 neutral or navy / 30 Carolina and campaign blue / 10 gold and yellow.
- Palette. The hex values are the canonical source from the original export; OKLCH values are documentary equivalents.
  - navy: oklch(0.285 0.083 254) | `#13294b`
  - campaign blue: oklch(0.47 0.132 256) | `#2959a4`
  - Carolina blue: oklch(0.75 0.126 255) | `#83b3ff`
  - gold: oklch(0.88 0.132 89) | `#ffd965`
  - yellow: oklch(0.95 0.122 105) | `#fff683`
  - orange: oklch(0.70 0.20 43) | `#fa6118`
  - magenta: oklch(0.61 0.245 3) | `#eb0677`
  - paper: oklch(0.98 0 0) | `#f8f8f8`
  - white: oklch(1 0 0) | `#ffffff`
  - success: navy text plus checkmark on `#fff683`; warning: navy text plus explicit label on `#ffd965`; error: white text plus explicit label on `#b42318`.
- Dark surfaces use `#13294b` with off-white `#f8f8f8`. Never use white text on Carolina blue; use navy instead.

## Spacing, radius, shadow

- Spacing base: 4px; scale: 1, 2, 3, 4, 6, 8, 12, 16, 24, 32.
- Radius: 0px for poster and institutional surfaces; 8px only for compact controls and approachable service modules.
- Shadow approach: defined offset edge only. Use a hard 8-12px Carolina-blue offset behind gold highlights; do not combine borders and diffuse shadows.

## Layout and composition

- Grid: flexible 12-column grid with `clamp(20px, 4vw, 76px)` gutters and a 1600px maximum canvas.
- Spacing rhythm: 8-16px within a content group, 48-112px between narrative sections.
- Signature layout move: every option may reorganize the story, but each must include one strong framed or offset-block statement.
- Density: balanced. Use F-pattern layouts for service and accountability concepts; Z-pattern layouts for image-led concepts.
- Responsive: mobile-first. Structural breakpoints at 42rem, 64rem, and 86rem. Complex grids collapse to reading order, never shrink into miniature desktop layouts.

## Components and states

- Button hierarchy: primary navy or campaign-blue fill, secondary two-pixel outline, tertiary underlined text. Hover shifts no more than 3px; active removes the shift; focus uses the shared ring; disabled lowers contrast and removes pointer behavior; loading retains the label width and adds text status.
- Inputs: persistent Montserrat labels above controls, validation after blur or submit, errors in text plus color, and user input retained.
- Tables: text left-aligned, numerals right-aligned with tabular figures, light separators, and no decorative zebra striping.
- Overlays: use sparingly; menus return focus to their trigger and close with Escape.
- Empty / loading / error: plain-language status plus one useful next action. Skeletons are unnecessary for this static landing page.
- Focus ring: 3px `#fff683` on navy or 3px `#2959a4` on light surfaces, with 3px offset.

## Motion

- Duration scale: instant 0ms, fast 160ms, normal 240ms, slow 360ms.
- Easing: ease-out `cubic-bezier(.2,.8,.2,1)`; ease-in-out `cubic-bezier(.4,0,.2,1)`.
- What animates: opacity and transform only. Reduced motion removes translations and reveals content immediately.
- Signature motion: appearing underlines and a restrained 2-3px chevron nudge.

## Iconography

- Set: custom inline line geometry only when text is insufficient. Grid: 20 or 24px. Stroke: 1.75-2px, square caps and miter joins to match the poster geometry.

## Imagery and illustration

- Mode: documentary UNC campus photography, candid student-community photography, and simplified Old Well geometry.
- Rules: crop decisively, preserve natural color, name people in alt text only when verified, and pair imagery with a flat navy or Carolina field rather than gradients.
- Avoid: generic stock campuses, corporate-Memphis illustration, synthetic people, glowing blobs, and unverified claims about pictured events.
- Text over image always sits on an opaque or at least 85% navy field with verified contrast.

## Dark mode

- The navy mode is an authored brand surface, not an inversion. Base `#13294b`, foreground `#f8f8f8`, Carolina-blue links, gold focus and highlights, and campaign-blue secondary fields.

## Accessibility

- Contrast: AA using approved brand pairings. Focus: visible and managed.
- Keyboard: all navigation and disclosure controls operable without a pointer. Targets: 44px for controls.
- Color independence: status always includes text or symbol. Reduced motion: supported. Semantic headings, landmarks, alt text, and skip links are required.

## Tokens (source of truth)

```css
:root {
  --brand-navy: #13294b;
  --brand-blue: #2959a4;
  --brand-carolina: #83b3ff;
  --brand-gold: #ffd965;
  --brand-yellow: #fff683;
  --brand-orange: #fa6118;
  --brand-magenta: #eb0677;
  --neutral-0: #ffffff;
  --neutral-50: #f8f8f8;
  --font-display: "Anton", "Arial Narrow", sans-serif;
  --font-body: "Montserrat Variable", Montserrat, Arial, sans-serif;
  --space-unit: 0.25rem;
  --radius-control: 0.5rem;
  --motion-fast: 160ms cubic-bezier(.2,.8,.2,1);
  --motion-normal: 240ms cubic-bezier(.2,.8,.2,1);
}
```

- Adapter: plain CSS custom properties.

## Cards and surfaces

- Cards and surfaces: group with proximity first; when enclosure is required, use either a 2px defined edge or a flat contrasting field, never border plus diffuse shadow. Avoid cards nested inside cards.

## Slop audit

- Date: 2026-08-11 | Result: pass after the refined institutional round.
- Notes: the 20 refined routes remove eyebrow copy, decorative hero marks, bordered campus photography, and repeated campaign language. They replace those tells with authentic campus and administration photography, official Student Government identification, flatter public-service modules, restrained Montserrat hierarchy, and a mix of curved, split, editorial, directory, progress, and task-first structures. All 45 routes remain isolated from the production homepage. Automated checks across the refined set found one H1 per route, no duplicate IDs, no missing hash targets, no headline clipping, and no visible eyebrow elements at 1440px, 390px, and 320px. Representative screenshots were reviewed at desktop and mobile sizes; all tested brand text/background pairs pass WCAG AA.

## Changelog

- 2026-08-11: established the administration landing-page design system and the governance rules for a 25-option exploration lab.
- 2026-08-11: implemented and audited the 25-option Astro design lab; added responsive, motion, focus, imagery, records, service, leadership, and accountability patterns.
- 2026-08-11: added 20 restrained, photo-led institutional concepts (26–45), bundled the official Student Government lockup, expanded the gallery navigator, and documented the refined mode.
- 2026-08-11: narrowed the exploration to three Wilson Library finalists with a symmetric curved hero, navy site navigation, seal-only identity, descriptive hero copy, and exactly four content areas: teams, priorities, updates, and events.
