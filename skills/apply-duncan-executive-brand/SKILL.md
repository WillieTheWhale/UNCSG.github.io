---
name: apply-duncan-executive-brand
description: Apply and verify the visual design system for Devin Duncan's UNC Student Government Executive Branch administration. Use when creating, editing, or reviewing pages, components, graphics, CSS tokens, typography, responsive behavior, or interaction patterns for executivebranch.unc.edu or other Duncan Administration digital interfaces.
---

# Apply the Duncan Executive Brand

Build interfaces that feel bold, civic, optimistic, and rooted in Carolina without
looking like a generic political campaign template. Treat this file as the canonical
digital schema until the communications team supplies a newer complete source.

## Follow the source hierarchy

Resolve conflicts in this order:

1. Current communications guidance: use **Anton** for display text and
   **Montserrat** for body, navigation, labels, and controls.
2. The original ProjectBOLD brand-guide PNG: use its exact palette and visual
   motifs.
3. The ProjectBOLD policy platform: use its framing, hierarchy, and tone as
   secondary evidence.
4. The prior `bennetthilberg/devin-sbp` campaign site: use only to fill interaction
   and campaign-to-administration continuity gaps.
5. Existing Executive Branch institutional requirements, especially the official
   UNC utility-bar embed and accessibility behavior.

Do not restore Cooper Hewitt or Young Serif. They appear in older sources and have
been superseded for this administration's digital work.

## Use the canonical palette

Use these exact values from the original brand-guide export as CSS primitives:

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
}
```

- Use navy for primary text, deep surfaces, and structural marks. The construction
  page uses navy as its full canvas with purpose-built opaque light text.
- Use campaign blue for links, focus, active states, and strong secondary actions.
- Use Carolina blue for broad brand fields, highlights, rules, and illustration.
- Use gold or yellow as a contained highlight behind navy text.
- Reserve orange and magenta for rare campaign-energy moments or event graphics;
  do not introduce them into routine navigation or core controls.
- Never approximate or locally restyle the required UNC institutional bar. Embed
  UNC ITS's hosted utility-bar script with its official `black` option on the
  construction page so the UNC logo, links, spacing, responsive behavior, and
  future updates remain canonical.
- Never use white text on Carolina blue; it fails WCAG AA at `2.13:1`.
- Navy on Carolina blue passes at `6.81:1`; campaign blue on `#f8f8f8` passes at
  `6.46:1`; white on campaign blue passes at `6.86:1`.

Do not derive colors from a screenshot of the kit. Screenshot resampling produced
nearby but incorrect values. Use only the original-export values above.

## Apply typography by role

- Load Anton weight 400 for display headlines, short section statements, and
  occasional high-impact numerals. Set it in uppercase and keep strings concise.
- Load Montserrat as a variable family for everything else. Use 400-500 for body,
  600-700 for controls, and 700-800 for short uppercase labels.
- Use tight but readable display leading around `0.88-0.98`; never use Anton for
  paragraphs or dense interface copy.
- Keep body copy at least `1rem`, use line-height around `1.55-1.7`, and constrain
  prose to roughly `60ch`.
- Use moderate positive tracking only for short uppercase Montserrat labels.

## Compose the visual language

- Create hierarchy with oversized Anton statements, strong blocks of navy or
  campaign blue, and spacious Montserrat support copy.
- Use the policy platform's poster grammar for high-impact moments: square inset
  frames, horizontal white rules, framed statements, and high-contrast all-caps
  type.
- Reuse three signature motifs where they clarify the composition: slightly
  offset color-block highlights with visible breathing room around the glyphs,
  appearing underlines, and simplified Old Well or Bell Tower geometry used as a
  faint watermark or bold illustration.
- Rounded-bottom blue section banners and connected circle-plus-label rows are
  allowed for real grouping. Do not turn routine controls into decorative pills.
- Prefer square or lightly softened geometry. Do not cover every surface in large
  radii, gradients, glass effects, or layered shadows.
- Keep broad surfaces flat. Use yellow as a small focal counterpoint rather than a
  full-page background.
- For the construction page, keep a single-column navy composition. Do not add an
  illustration or secondary panel; the offset gold-and-Carolina block behind
  `BOLD` is the one expressive focal treatment.
- Keep the construction headline on one line above the mobile breakpoint so it
  occupies most of the available width with sensible page gutters. On true mobile
  widths, keep `BOLD` on its own line but let the remaining words wrap naturally
  across the full available content width; never cap the headline to a narrow
  character measure. Use slightly looser display leading for the mobile poster
  treatment.
- Center the construction-page message group horizontally and bias it slightly
  above the viewport midpoint with responsive spacing. Keep the mobile headline
  centered while allowing it to use the full content width; do not restyle or
  recenter the official UNC utility bar.
- Use documentary campus photography only when a high-quality, relevant image is
  available; do not add generic stock imagery.
- Write in a confident institutional voice centered on courage, community,
  accountability, equity, innovation, student support, and transparency. Preserve
  the campaign's energy without using election language on administration pages.

## Build interactions accessibly

- Distinguish text links with more than color: use an underline, weight change,
  chevron, or another persistent structural cue.
- For the signature link treatment, animate an underline from left to right and
  nudge the chevron no more than a few pixels on hover or keyboard focus.
- Provide a visible `:focus-visible` outline with at least 3:1 non-text contrast.
- Keep pointer targets at least 44px when they behave as controls; inline prose
  links may size to their text.
- Respect `prefers-reduced-motion` and keep all motion short and nonessential.
- Preserve semantic heading order, DOM reading order, link names, and a working
  skip link. Do not rely on color alone.

## Preserve the deployment contract

- Keep the site statically generated with Astro unless server-side behavior is
  explicitly required and the CloudApps architecture is re-evaluated.
- Build Astro in a Docker builder stage and serve `dist/` from
  `nginxinc/nginx-unprivileged` on port `8080`.
- Preserve the OpenShift BuildConfig, ImageStream, Deployment, Service, and Route.
- Keep the source ref on `main`; feature branches should not deploy by themselves.
- Update the Dockerfile whenever the build inputs or output directory change.
- Remove construction-page `noindex` metadata when the full site launches.

## Verify before handing off

1. Run the project's type/content checks and production build.
2. Inspect at 320-390px, around each structural breakpoint, 1440px, and a wide
   max-width view.
3. Check 200% zoom, keyboard focus, hover, and reduced-motion behavior.
4. Confirm Anton and Montserrat load locally with no failed font requests.
5. Confirm `/`, former deep links, and missing routes resolve to the intended page.
6. Validate the Docker image or an equivalent unprivileged nginx runtime on port
   `8080` before claiming CloudApps readiness.
