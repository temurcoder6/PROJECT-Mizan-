---
name: Mizan
description: Daily money plan for Uzbek households, set like Samarkand tilework on a cobalt and plaster ground.
colors:
  cobalt: "#0E2A5C"
  cobalt-deep: "#0A1F45"
  cobalt-night: "#071633"
  plaster: "#F4F1EA"
  plaster-dim: "#E7E2D6"
  turq: "#1FA6A0"
  turq-soft: "#7FD3CE"
  ochre: "#C9962B"
  ochre-bright: "#F2C46B"
typography:
  display:
    fontFamily: "Unbounded Variable, Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.35rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Unbounded Variable, Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Unbounded Variable, Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "Unbounded Variable, Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
  lead:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  seam: "2px"
  step: "3px"
  control: "6px"
  panel: "12px"
  device-laptop: "1.3rem"
  device-phone: "3.4rem"
  pill: "9999px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  container: "76rem"
  stack-sm: "12px"
  stack-md: "28px"
  stack-lg: "64px"
  section: "96px"
  section-lg: "112px"
  section-xl: "144px"
components:
  button-light:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
  button-light-hover:
    backgroundColor: "#FFFFFF"
  button-dark:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
  button-dark-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-ghost:
    textColor: "{colors.plaster}"
    rounded: "{rounded.control}"
    padding: "14px 20px"
  nav-cta:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  step-badge:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.step}"
    size: "20px"
  panel-cobalt:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.panel}"
    padding: "32px"
  mosaic-tile-feature:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.plaster}"
    padding: "28px"
  mosaic-tile-plaster:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.cobalt}"
    padding: "28px"
---

# Design System: Mizan

## Overview

**Creative North Star: "The Registan Ledger"**

A money plan set like Samarkand tilework: every piece lands exactly in its place, and Mizan means balance. The landing world is built from two grounds that own whole regions, deep cobalt glaze and chalk-white plaster, with gold-ochre drawn over them only as thin girih linework. One colour, turquoise, is held back for whatever is live or moving, so the eye always finds the working product first. The eight-point girih star is the single ornament: it is the logo, the list bullet, the step badge, the background field and the 3D medallion that holds the live phone.

Density is calm and architectural. Sections are tall bands with generous vertical air; content runs in wide rows separated by hairlines rather than stacked cards. Depth comes from glazed-tile sheen and real CSS 3D (the rotating star, the tilted phone and laptop), never from heavy drop shadows. Everything has a lite floor: on weak hardware or with reduced motion, blur, continuous rotation and the intro disappear and the page stays complete.

Confirmed rejections: the fintech split hero with three cards under it, and the cream-serif-lime look of the previous site. No serif type anywhere in this world.

Scope: this system governs the public landing site (`Site.jsx`, intro, device frames). The app shown inside the phone and laptop iframes keeps its own emerald app styling and is not described here.

**Key Characteristics:**
- Two grounds (cobalt, plaster) alternate by section; no mid-tone grey ground.
- Ochre is line, never fill: 1px seams, hairline rules, star outlines, bullets, small icons.
- Turquoise marks only the live or active element.
- Wide geometric display face at weight 600 with tight tracking; quiet humanist body.
- Glazed-tile panels are the only glass; moving layers carry sheen without blur.
- Lite mode is a first-class rendering, not a degraded one.

## Colors

A two-ground tile palette: saturated cobalt and warm plaster carry the page, ochre draws, turquoise signals life.

### Primary
- **Registan Cobalt** (`cobalt`): the default dark ground. Hero, CTA bands, step section, feature heroes, calculator result side, the formula panel and the face of the girih star and device bodies.
- **Deep Glaze** (`cobalt-deep`): hover state of dark buttons, the bottom fade of the hero, the intro curtain, the laptop lid and phone body tint.
- **Night Cobalt** (`cobalt-night`): the quietest dark ground, used for the laptop section, the honest-status section and the footer, where the page breathes before or after a strong band.

### Secondary
- **Live Turquoise** (`turq`): only for the live or active element: the active tab underline, live dots on device notches and "works now" labels, the intro's core flash, the outer band of the focus ring (a 2px cobalt-deep outline inside a 4px turquoise band, so it reads on both grounds) and the text selection. The calculator input focus line is cobalt, not turquoise, for contrast on plaster.
- **Soft Turquoise** (`turq-soft`): turquoise text on cobalt where `turq` is too dim for small type (live labels such as "Kuniga", "Hozir ishlaydi" and their bullets; the promo reel's single moving CTA).

### Tertiary
- **Girih Ochre** (`ochre`): linework only. The girih field pattern, star outlines, 1px mosaic seams, hairline section rules (at 50% on plaster), the active nav underline, star bullets, FAQ chevrons, lock icons and the gold seam on device edges.
- **Lamp Ochre** (`ochre-bright`): caution text on cobalt, used where a result is a shortfall ("Yetishmaydi") or a capability depends on the device. Currently hard-coded in source rather than declared in `@theme`.

### Neutral
- **Chalk Plaster** (`plaster`): the light ground and the text colour on every cobalt region; on cobalt, secondary text is plaster at 60 to 80% opacity, never a grey.
- **Dim Plaster** (`plaster-dim`): the calculator and FAQ band (at 60%), the scrollbar track and the shaded underside of the laptop base.

### Named Rules
**The Live Turquoise Rule.** Turquoise appears only on what is live, moving or currently active. If an element would look the same in a screenshot of a dead page, it does not get turquoise. Headlines never use it.

**The Ochre Hairline Rule.** Ochre is drawn, not poured: lines of 1px (or a small solid star bullet or icon), never a filled surface or a run of text on plaster, where it reaches only 2.4:1.

**The Two Grounds Rule.** Every section commits to cobalt (any of the three depths) or plaster. Text on cobalt is plaster; text on plaster is cobalt at 75 to 100%.

## Typography

**Display Font:** Unbounded Variable (with Onest Variable, ui-sans-serif)
**Body Font:** Onest Variable (with ui-sans-serif, system-ui, Segoe UI)

**Character:** A wide, geometric display face with real weight carries the voice like inscribed tile lettering; Onest keeps the reading text plain and friendly. Unbounded is the build's adaptation of the direction's "geometric-humanist sans with weight": it lands wider and more geometric than humanist, and that is the shipped voice.

### Hierarchy
- **Display** (600, 2.1rem to 2.9rem at sm to 3.35rem at xl, line-height 1.1, -0.02em): page hooks in heroes, balanced. On the home hero the first sentence is plaster at 80% and the second sentence is full plaster on its own line.
- **Headline** (600, 1.85rem to 2.6rem at sm, line-height 1.15, -0.02em): section titles, max 2xl to 3xl width, text-balance.
- **Title** (600, 1.5rem to 1.7rem, -0.02em): reason rows, steps, mosaic tiles (feature tile 2.25rem to 3rem), feature page steps.
- **Numeral** (600, 3rem to 3.75rem, tabular): the calculator result and step numbers inside star badges.
- **Body** (400, 17px, line-height 1.625, max about 38rem): reason and feature copy in cobalt at 75 to 85%.
- **Lead** (400, 1.125rem, line-height 1.625, max 34rem): hero subcopy in plaster at 78%.
- **Label** (600, 13 to 14px): tabs, small panel headings, footer column heads. Sentence case, no tracking, no uppercase.

### Named Rules
**The Inscription Rule.** Unbounded is for headings, numerals and the wordmark only, always at 600 with -0.02em tracking. Running text, buttons and labels are Onest.

**The Plain Label Rule.** No uppercase tracked micro-labels above headings. A heading stands on its own; a small label exists only when it carries information (a live state, a step count).

## Layout

A single centred container (max 76rem, side gutter 20px, 32px from sm) holds every section; full-bleed colour bands carry the section grounds. Vertical rhythm is generous: sections run 96px to 112px top and bottom, opening bands up to 144px at sm. Within sections, rows separated by hairlines replace card grids: the three reasons are full-width rows with a title column and a text column (1fr / 1.15fr from md), the data path is three stations on one ochre line, and the steps are glazed panels stepped right by 3rem and 6rem at lg to suggest progress.

The home hero fills the viewport at lg (100dvh minus the 4rem nav) on a two-column grid (1fr / 1.05fr), copy aligned to the bottom left and the girih medallion with the live phone on the right; below lg it stacks copy first. The sections mosaic is a 4-column grid with the feature tile spanning 2x2 and rows of at least 12rem. Sticky section titles (top 7rem) pin beside long lists at lg. Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024, xl 1280).

## Elevation & Depth

Depth is material, not floating: glazed-tile sheen, real CSS 3D and tonal steps between the three cobalts. Shadows are soft, offset downward with negative spread, and only under things that physically sit above the ground (buttons, glazed panels, devices). Device contact shadows are radial gradients, never blur filters.

### Shadow Vocabulary
- **Button lift on cobalt** (`box-shadow: 0 10px 24px -12px rgb(0 0 0 / 0.6)`): under the plaster button.
- **Button lift on plaster** (`box-shadow: 0 12px 24px -14px rgb(14 42 92 / 0.8)`): under the cobalt button.
- **Glaze dark** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.22), 0 18px 40px -24px rgb(0 0 0 / 0.6)`): glazed panels on cobalt.
- **Glaze light** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.9), 0 20px 40px -30px rgb(14 42 92 / 0.45)`): the plaster nav strip.
- **Device contact** (`radial-gradient(closest-side, rgba(3,10,26,.55), rgba(3,10,26,.22) 55%, transparent)`): an ellipse under the phone and laptop.

### Named Rules
**The One Glass Rule.** The glazed tile (a 155deg white sheen gradient, 1px light border, inset top highlight, blur 8 to 10px) is the only glass. Anything that moves (the star, the phone, the laptop) keeps the sheen and drops the backdrop blur.

**The Lite Floor Rule.** Under `html.lite` (reduced motion, 2 or fewer cores, 2GB or less memory, or `?lite=1`) glass becomes solid (dark `#173a73`, light `#fbfaf6`), the star stops rotating and holds a still angle, devices stop tilting and floating, and the intro is skipped. Every effect must have this solid, still fallback.

## Shapes

Corners are small and architectural: tile seams are nearly square (2px), the numbered step chip 3px, buttons and controls 6px, panels 12px. Only devices are strongly rounded (laptop lid 1.3rem, phone 3.4rem), and pills appear only for small device controls and the promo reel. The recurring silhouette is the eight-point girih star (two crossed squares, inner ratio 0.765), drawn as a 1px outline at every scale; its points lock the module that bullets, badges, the logo and the background field share.

## Components

### Buttons
Solid, tile-like and confident; they lift slightly on hover.
- **Shape:** gently squared (6px).
- **Light (primary on cobalt):** plaster ground, cobalt text, 600 weight, 14px by 24px, button lift shadow; hover goes to white and rises 2px.
- **Dark (primary on plaster):** cobalt ground, plaster text, same metrics; hover deepens to `cobalt-deep` and rises 2px.
- **Ghost (secondary on cobalt):** no fill, plaster text, a 1px plaster ring at 30%; hover adds a 10% plaster wash.
- **Focus:** 2px turquoise outline offset 2px (site-wide `:focus-visible` is offset 3px).
- Trailing arrow icon (ArrowRight for the main action, ArrowUpRight for "learn more" links).

### Navigation
- A sticky 64px light-glaze strip over the page with a 1px cobalt hairline at 10%. Logo (star mark plus "Mizan" in Unbounded 600) left, links in Onest 14px medium cobalt at 65%, the current page at full cobalt with a 1px ochre underline. A compact cobalt "open app" button sits at the right. Below lg, links collapse into a plaster drop panel of full-width rows divided by cobalt hairlines.

### Tabs
- Plaster labels (13px, 600) on cobalt over a 1px plaster hairline at 15%; inactive at 60%, active at full plaster with a 2px turquoise underline. Used above the girih phone and the laptop.

### Cards / Containers
- **Glazed step panel:** dark glaze on cobalt, 12px corners, 24 to 32px padding, an ochre star outline enclosing a display numeral.
- **Cobalt panel:** solid cobalt on plaster, 12px corners, 32px padding, a faint girih field (10% opacity) behind the content, a plaster hairline at 15% separating the worked example.
- **Status columns:** one glazed (works now, turquoise label), two outlined with plaster rings at 15% and 10%, stepping down in emphasis.

### Inputs / Fields
- **Style:** underline only, no box: 2px cobalt line at 20% under 1.5rem tabular cobalt numbers, transparent ground. Each label carries a 20px cobalt step chip (3px corners) with its number.
- **Focus:** the underline turns turquoise.

### Mosaic
- The sections grid is set like tile: an ochre ground with 1px gaps and 1px padding forms the seams, with 2px outer corners. Tiles alternate cobalt, plaster and a mid tile cobalt (`#123569`); the 2x2 feature tile carries a girih field and an ochre star that turns 45deg on hover. Each tile reveals an ArrowUpRight on hover.

### Girih Medallion
- The signature: a CSS-3D eight-point star (three cobalt thickness slices, a glazed cobalt face, ochre linework, eight plaster kites, a floating ochre ring) that rotates once per 40s and tilts up to 10deg toward the pointer. It pauses off-screen and in hidden tabs and holds a still angle in lite mode. The live phone sits flat and clickable at its centre.

### Device Frames
- Phone and laptop share one material: cobalt glazed body with a 1px ochre rim at 75%, a near-black bezel with an ochre hairline at about 30%, a gold seam layer in the edge thickness, a static 115deg screen sheen, and a single turquoise live dot in the notch. The screens are real app iframes.

### Star Bullet List
- Rows of Onest 17px text led by a 12px solid star in ochre (turquoise-soft for "works now", plaster at 30% for "next stage"); safety rows divide with cobalt hairlines at 10%.

### Intro
- One 1.6s timed sequence, once per browser session: eight cobalt kites with ochre outer edges fly in and assemble the star (0 to 0.7s), the core flashes turquoise and settles to plaster while the wordmark slides in (0.7 to 1.1s), then the mark flies to the nav logo by FLIP and the curtain fades (1.1 to 1.6s). Click or any key skips it; lite and reduced motion skip it entirely.

### Formula Reveal
- Calculator formula terms appear one after another (80ms stagger, 0.32s, expo-out) and each draws a 1px ochre underline from the left; the result numeral settles in after with a 0.45s tile-in.

## Do's and Don'ts

### Do:
- **Do** give each section one ground, cobalt (any depth) or plaster, and keep text plaster on cobalt and cobalt on plaster.
- **Do** draw ochre as 1px lines, seams, outlines, star bullets and small icons.
- **Do** reserve turquoise for the live element: active tab, live dot, focus ring band, selection, "works now" state.
- **Do** use the eight-point star (ratio 0.765) as the only ornament: logo, bullets, badges, girih field at 6 to 14% opacity.
- **Do** set headings in Unbounded 600 at -0.02em and everything else in Onest.
- **Do** separate content with hairline rows before reaching for cards.
- **Do** give every blur, rotation and entrance a still, solid lite fallback, and animate only transform and opacity.
- **Do** strip backdrop blur from any layer that moves.

### Don't:
- **Don't** use turquoise in headlines, body copy or static decoration.
- **Don't** fill surfaces with ochre or set running text in ochre on plaster.
- **Don't** introduce a serif face or the cream, serif and lime palette of the previous site.
- **Don't** add glass beyond the glazed tile, or blur filters for shadows.
- **Don't** add uppercase tracked eyebrow labels above headings.
- **Don't** apply this landing system to the in-app UI inside the device iframes; the app keeps its own styling.
