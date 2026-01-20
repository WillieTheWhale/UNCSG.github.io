# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML website for the UNC Student Government (Alvarez Administration 2025-2026). Uses a magazine/editorial aesthetic inspired by The Daily Tar Heel, The Atlantic, and Politico.

## Architecture

**No build system** - Pure static HTML files with a single shared CSS file. No JavaScript framework, bundler, or package.json.

### File Structure
- `styles-carolina-editorial.css` - Single CSS file containing the entire design system
- `*.html` - 30+ static HTML pages following consistent template structure
- Images hosted externally at `executivebranch.unc.edu`

### CSS Design System

The CSS uses a well-documented component architecture with sections marked by `/* ========== SECTION NAME ========== */` comments.

**Key CSS Variables (`:root`):**
- Colors: `--editorial-navy`, `--editorial-blue`, `--editorial-cream`, `--editorial-paper`
- Typography: `--font-editorial-display` (Playfair Display), `--font-editorial-serif` (Libre Baskerville), `--font-editorial-sans` (Open Sans)
- Spacing: `--space-xs` through `--space-3xl`
- Type scale: `--type-display` through `--type-label`

**Main CSS Sections:**
1. Custom Properties & Reset
2. Typography System (headlines, pull quotes, bylines, drop caps)
3. Layout Containers (`.container`, `.section`, `.section-alt`)
4. UNC Official Bar & Site Header
5. Hero Section
6. Button System (`.btn`, `.btn-secondary`, `.btn-outline-white`)
7. Card System (`.profile-card`, `.initiative-card`, `.quick-link-card`, `.news-card`)
8. Footer (`.site-footer`, `.footer-brand`, `.footer-column`)
9. Mobile Navigation (CSS-only hamburger menu using checkbox hack)
10. Responsive breakpoints and print styles

### HTML Template Structure

All pages follow this structure:
```html
<body>
  <a class="skip-link">...</a>
  <div class="unc-bar">...</div>
  <header class="site-header">...</header>
  <main id="main-content">...</main>
  <footer class="site-footer">...</footer>
</body>
```

**Header logo**: `Undergrad_Exec_Branch_Logo_Full_1.png`
**Footer logo**: `Undergrad_Exec_Branch_Logo_Full_3.png` (white variant for dark background)

### External Dependencies (CDN)
- Google Fonts: Playfair Display, Libre Baskerville, Open Sans
- Iconoir Icons: `https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css`

## Development

**To preview**: Open any HTML file directly in a browser (no server required).

**Making changes**:
- Edit `styles-carolina-editorial.css` for styling changes
- Edit individual HTML files for content changes
- Changes must be replicated across HTML files for shared elements (header, footer, navigation)

## Conventions

- WCAG AA accessibility compliance for color contrast
- Mobile-first responsive design with touch-friendly targets (44px minimum)
- CSS-only mobile navigation (no JavaScript required)
- Scroll animations use CSS `animation-timeline: view()` where supported, with IntersectionObserver fallback
