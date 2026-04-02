---
title: "HTML, CSS & Web APIs — Interview-Ready Deep Dive"
date: 2026-04-02
description: "A comprehensive reference covering Critical Rendering Path, Semantic HTML, Flexbox, Grid, Responsive Design, TailwindCSS, Bootstrap, SASS/LESS, BEM, Web APIs, Web Workers, Geolocation API, and Local/Session Storage."
tags: [HTML, CSS, WebAPIs]
draft: false
---
# HTML, CSS & Web APIs — Interview-Ready Deep Dive

> A comprehensive reference covering Critical Rendering Path, Semantic HTML, Flexbox, Grid, Responsive Design, TailwindCSS, Bootstrap, SASS/LESS, BEM, Web APIs, Web Workers, Geolocation API, and Local/Session Storage.

---

## Table of Contents

1. [Critical Rendering Path](#1-critical-rendering-path)
2. [Semantic HTML Elements](#2-semantic-html-elements)
3. [Flexbox](#3-flexbox)
4. [CSS Grid](#4-css-grid)
5. [Responsive Design — Media Queries & Bootstrap](#5-responsive-design--media-queries--bootstrap)
6. [TailwindCSS, Bootstrap & Preprocessors (SASS/LESS)](#6-tailwindcss-bootstrap--preprocessors-sassless)
7. [CSS Methodologies — BEM](#7-css-methodologies--bem)
8. [Web APIs Overview](#8-web-apis-overview)
9. [Web Workers](#9-web-workers)
10. [Geolocation API](#10-geolocation-api)
11. [Local Storage & Session Storage](#11-local-storage--session-storage)

---

## 1. Critical Rendering Path

### What Is It?

The **Critical Rendering Path (CRP)** is the sequence of steps the browser performs to convert HTML, CSS, and JavaScript into pixels on the screen. Understanding it is fundamental to optimising web performance.

The steps are:

```
HTML bytes → Characters → Tokens → Nodes → DOM
CSS bytes  → Characters → Tokens → Nodes → CSSOM
DOM + CSSOM → Render Tree → Layout → Paint → Composite
```

### Step-by-Step Breakdown

#### 1. Building the DOM (Document Object Model)

When the browser receives HTML bytes from the server, it converts them through several stages:

1. **Bytes → Characters** — Raw bytes decoded using the charset (e.g., UTF-8)
2. **Characters → Tokens** — The HTML parser identifies tokens like `<html>`, `<body>`, `</p>`
3. **Tokens → Nodes** — Each token becomes a node object
4. **Nodes → DOM Tree** — Nodes are linked in a parent-child tree structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>CRP Demo</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
```

> **Interview note:** The browser constructs the DOM **incrementally** as bytes arrive. This is why placing scripts at the bottom of `<body>` matters — the DOM can be partially ready for JavaScript before it finishes loading.

#### 2. Building the CSSOM (CSS Object Model)

CSS is fetched and parsed similarly to HTML, but results in a **CSSOM tree** that captures all the styles and their specificity cascade.

**Critical distinction:** The CSSOM is built **all at once**, not incrementally. The browser cannot partially apply CSS because a child rule can override a parent rule. The browser must have the complete stylesheet before it can compute final styles.

```css
body {
  font-size: 16px;
}
h1 {
  font-size: 2em; /* computed: 32px based on body's 16px */
}
p {
  color: #333;
}
```

> **Interview note:** CSS is **render-blocking** by default. While CSS is being fetched and parsed, the browser cannot render any content. This is why performance guides say "put CSS in the `<head>`" — you want it downloaded early so the CSSOM is ready before JavaScript runs.

#### 3. Render Tree

The browser combines the DOM and CSSOM into a **Render Tree** that contains only the visible nodes with their computed styles.

- Nodes with `display: none` are **excluded** from the render tree entirely
- Nodes with `visibility: hidden` are **included** (they take up space) but just not painted
- Pseudo-elements like `::before` and `::after` are **added** even though they don't exist in the DOM

#### 4. Layout (Reflow)

The browser traverses the render tree and computes the **exact position and size** of every element on the page. This produces a "box model" for each element.

- Layout is expensive for large pages
- Any time you change an element's geometry (width, height, margin, padding, position), the browser **reflows**

```javascript
// Forces a reflow — very expensive in a loop
for (let i = 0; i < 100; i++) {
  element.style.width = element.offsetWidth + 10 + 'px';
  //                     ^^^ reading offsetWidth forces layout to be recalculated
}

// Better: read first, then write
const width = element.offsetWidth; // one layout read
for (let i = 0; i < 100; i++) {
  element.style.width = width + i * 10 + 'px'; // only writes, no forced reflow
}
```

> **Interview note:** Interleaving reads and writes of layout properties inside a loop causes **layout thrashing** — one of the most common performance bottlenecks.

#### 5. Paint

The browser fills in the pixels — colours, text, images, shadows, borders. This happens on multiple layers.

#### 6. Compositing

Composited layers are combined by the GPU and sent to the screen. Properties that only affect compositing (like `transform` and `opacity`) skip Layout and Paint entirely, which is why they are favoured for animations.

```css
/* Slow: triggers Layout + Paint + Composite */
.bad-animation {
  transition: width 0.3s, height 0.3s, margin 0.3s;
}

/* Fast: only triggers Composite (GPU-accelerated) */
.good-animation {
  transition: transform 0.3s, opacity 0.3s;
}
```

### Optimising the Critical Rendering Path

| Technique | Why It Helps |
|-----------|-------------|
| `<link rel="preload">` | Downloads critical resources early |
| Inline critical CSS | No extra HTTP request for above-the-fold styles |
| `async` / `defer` on scripts | Prevents JS from blocking HTML parsing |
| Minify CSS/JS | Smaller files = faster parse |
| Use `transform`/`opacity` for animations | Skips Layout and Paint |
| Lazy load images (`loading="lazy"`) | Images outside viewport don't block rendering |

```html
<!-- async: downloads in parallel, executes as soon as available (can block HTML) -->
<script async src="analytics.js"></script>

<!-- defer: downloads in parallel, executes AFTER HTML is fully parsed -->
<script defer src="app.js"></script>

<!-- Preload a critical font so it's available before the render tree is built -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
```

> **Interview tip:** Be prepared to explain the difference between `async` and `defer`. With `async`, execution order is not guaranteed. With `defer`, scripts execute in document order after parsing is complete.

---

## 2. Semantic HTML Elements

### What Are Semantic Elements?

Semantic HTML elements convey **meaning** about the content they contain, not just how it looks. They describe the role of the content to both the browser and to tools like screen readers and search engine crawlers.

**Non-semantic (meaningless to machines):**
```html
<div id="header">...</div>
<div class="nav">...</div>
<div id="main-content">...</div>
```

**Semantic (meaningful to machines):**
```html
<header>...</header>
<nav>...</nav>
<main>...</main>
```

### Complete Reference of Semantic Elements

#### Document Structure

```html
<header>
  <!-- Site-wide or section header: logo, site title, primary navigation -->
  <!-- Can appear multiple times: once for the page, once inside each <article> -->
  <h1>My Blog</h1>
  <nav>...</nav>
</header>

<nav>
  <!-- A block of navigation links — primary menus, breadcrumbs, pagination -->
  <!-- Not every group of links needs to be a <nav>; reserve it for major navigation -->
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<main>
  <!-- The dominant content of the <body> — there should be ONLY ONE <main> per page -->
  <!-- Do NOT put <header>, <footer>, or <nav> inside <main> unless they are content -->
</main>

<aside>
  <!-- Content tangentially related to the main content -->
  <!-- Sidebars, pull quotes, related article links, ads -->
</aside>

<footer>
  <!-- Footer for its nearest sectioning ancestor (body, article, section) -->
  <!-- Copyright, contact info, related links -->
</footer>
```

#### Content Sectioning

```html
<article>
  <!-- A self-contained piece of content that could stand alone -->
  <!-- Blog posts, news articles, forum posts, comments, widgets -->
  <!-- Ask: "Would this make sense if syndicated by RSS?" -->
  <header>
    <h2>Article Title</h2>
    <time datetime="2026-04-02">April 2, 2026</time>
  </header>
  <p>Article body...</p>
  <footer>Posted by Aditya</footer>
</article>

<section>
  <!-- A thematic grouping of content, usually with a heading -->
  <!-- Use when content is related but not self-contained enough for <article> -->
  <h2>Features</h2>
  <p>Our key features...</p>
</section>
```

> **Interview note:** The most commonly confused pair is `<article>` vs `<section>`. Rule of thumb: if you can take the element, put it on a different page, and it still makes sense on its own → use `<article>`. If it's just a themed chunk of a larger whole → use `<section>`.

#### Text-Level Semantics

```html
<!-- <strong> — strong importance, seriousness, or urgency (bold by default) -->
<p>Warning: <strong>Do not delete this file.</strong></p>

<!-- <em> — stress emphasis that changes the meaning of a sentence (italic by default) -->
<p>I <em>never</em> said she stole the money.</p>
<!-- vs -->
<p>I never said <em>she</em> stole the money.</p>
<!-- These two sentences have different meanings due to emphasis placement -->

<!-- <b> — draw attention WITHOUT implying importance (keywords, product names) -->
<p>The <b>quick brown fox</b> jumps over the lazy dog.</p>

<!-- <i> — alternate voice, technical terms, foreign language, thoughts -->
<p>The word <i>schadenfreude</i> is German for pleasure from others' misfortune.</p>

<!-- <mark> — highlighted/relevant text in a search result context -->
<p>Results for "flexbox": Use <mark>flexbox</mark> to build one-dimensional layouts.</p>

<!-- <time> — machine-readable dates and times -->
<p>Published on <time datetime="2026-04-02T09:00">April 2, 2026</time></p>

<!-- <abbr> — abbreviations and acronyms -->
<p>The <abbr title="Critical Rendering Path">CRP</abbr> affects page load speed.</p>

<!-- <cite> — the title of a creative work -->
<p>According to <cite>MDN Web Docs</cite>, semantic HTML improves accessibility.</p>

<!-- <code> — inline code -->
<p>Use <code>display: flex</code> to activate flexbox on a container.</p>

<!-- <pre> — preformatted text, preserves whitespace and line breaks -->
<pre><code>
function greet(name) {
  return `Hello, ${name}!`;
}
</code></pre>

<!-- <blockquote> and <q> — quotations -->
<blockquote cite="https://example.com/source">
  <p>Design is not just what it looks like. Design is how it works.</p>
</blockquote>

<!-- <figure> and <figcaption> — self-contained media with optional caption -->
<figure>
  <img src="chart.png" alt="Sales chart Q1 2026" />
  <figcaption>Fig. 1 — Q1 2026 sales increased 20% YoY.</figcaption>
</figure>

<!-- <address> — contact information for the nearest <article> or <body> -->
<address>
  Written by <a href="mailto:aditya@example.com">Aditya</a>.<br />
  Visit us at 123 Main St, Hyderabad.
</address>
```

### Why Semantics Matter

1. **Accessibility:** Screen readers use semantic elements to navigate. A screen reader user can jump between `<nav>`, `<main>`, `<article>`, and `<footer>` sections using keyboard shortcuts — but only if the elements are there.

2. **SEO:** Search engines weight content inside `<h1>`–`<h6>`, `<article>`, and `<strong>` more heavily than generic `<div>` content.

3. **Maintainability:** A team reading `<nav>` immediately understands the purpose; `<div class="nav-wrapper-2">` requires extra context.

---

## 3. Flexbox

### Core Concept

Flexbox (Flexible Box Layout) is a **one-dimensional** layout model. It lays items out along a single axis — either a row or a column. This is its key distinction from Grid (which is two-dimensional).

Think of it as: you have a **flex container**, and inside it are **flex items**. The container controls how items are distributed along the main axis and aligned on the cross axis.

```
Main Axis (row): →→→→→→→→→→→→→→→
Cross Axis:      ↓
                 ↓
```

### Activating Flexbox

```css
.container {
  display: flex;        /* block-level flex container */
  /* display: inline-flex; for inline-level flex container */
}
```

### Container Properties

#### `flex-direction` — Defines the Main Axis

```css
.container {
  flex-direction: row;            /* default — left to right */
  flex-direction: row-reverse;    /* right to left */
  flex-direction: column;         /* top to bottom */
  flex-direction: column-reverse; /* bottom to top */
}
```

> When `flex-direction: column`, the main axis becomes vertical and the cross axis becomes horizontal. All axis-based properties (justify-content, align-items) flip accordingly.

#### `flex-wrap` — Should Items Wrap?

```css
.container {
  flex-wrap: nowrap;       /* default — items shrink to fit on one line */
  flex-wrap: wrap;         /* items wrap onto new lines from top to bottom */
  flex-wrap: wrap-reverse; /* items wrap onto new lines from bottom to top */
}
```

#### `justify-content` — Alignment on the Main Axis

```css
.container {
  justify-content: flex-start;    /* pack items at the start (default) */
  justify-content: flex-end;      /* pack items at the end */
  justify-content: center;        /* center items */
  justify-content: space-between; /* first item at start, last at end, equal space between */
  justify-content: space-around;  /* equal space around each item (half-space at edges) */
  justify-content: space-evenly;  /* equal space between items AND at edges */
}
```

#### `align-items` — Alignment on the Cross Axis (Single Line)

```css
.container {
  align-items: stretch;     /* default — items stretch to fill container height */
  align-items: flex-start;  /* items align at the start of the cross axis */
  align-items: flex-end;    /* items align at the end of the cross axis */
  align-items: center;      /* items center on the cross axis */
  align-items: baseline;    /* items align by their text baselines */
}
```

#### `align-content` — Alignment on the Cross Axis (Multiple Lines)

`align-content` only applies when there are **multiple rows** (flex-wrap is active). It controls how those rows are distributed along the cross axis.

```css
.container {
  align-content: flex-start;
  align-content: flex-end;
  align-content: center;
  align-content: space-between;
  align-content: space-around;
  align-content: stretch; /* default */
}
```

> **Interview trap:** `align-items` controls alignment of items within a single row. `align-content` controls the spacing between multiple rows. If you only have one row, `align-content` has no effect.

#### `gap` — Spacing Between Items

```css
.container {
  gap: 16px;           /* equal gap in both row and column directions */
  row-gap: 16px;       /* only between rows */
  column-gap: 8px;     /* only between columns */
  gap: 16px 8px;       /* shorthand: row-gap column-gap */
}
```

### Item Properties

#### `flex-grow` — How Much Should the Item Grow?

```css
/* If remaining space is 300px and you have 3 items: */
.item-a { flex-grow: 1; } /* gets 100px */
.item-b { flex-grow: 2; } /* gets 200px */
.item-c { flex-grow: 0; } /* gets 0px — default, won't grow */
```

> `flex-grow` is a **ratio**, not a fixed size. Items grow proportionally to their `flex-grow` values.

#### `flex-shrink` — How Much Should the Item Shrink?

```css
/* If container is 100px too narrow and you have 2 items: */
.item-a { flex-shrink: 1; } /* shrinks by 50px */
.item-b { flex-shrink: 3; } /* shrinks by 75px (3x more) */
.item-c { flex-shrink: 0; } /* never shrinks — can overflow */
```

#### `flex-basis` — The Item's Starting Size

```css
.item {
  flex-basis: auto;   /* default — use the item's width/height */
  flex-basis: 200px;  /* start at exactly 200px before growing/shrinking */
  flex-basis: 25%;    /* start at 25% of the container */
  flex-basis: 0;      /* start from nothing — all space is distributed via flex-grow */
}
```

#### `flex` Shorthand — The Right Way

The `flex` shorthand combines `flex-grow`, `flex-shrink`, and `flex-basis`. Always prefer the shorthand.

```css
.item {
  flex: 0 1 auto; /* default: don't grow, can shrink, natural size */
  flex: 1;        /* shorthand for: flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex: auto;     /* shorthand for: flex-grow: 1, flex-shrink: 1, flex-basis: auto */
  flex: none;     /* shorthand for: flex-grow: 0, flex-shrink: 0, flex-basis: auto */
  flex: 2 1 150px; /* grow twice as fast, can shrink, starts at 150px */
}
```

#### `align-self` — Override the Container's `align-items` for One Item

```css
.container {
  align-items: center; /* all items centered by default */
}

.special-item {
  align-self: flex-start; /* this item alone aligns to the start */
}
```

#### `order` — Change Visual Order Without Changing the DOM

```css
.item-a { order: 2; }  /* visually third */
.item-b { order: 1; }  /* visually second */
.item-c { order: 0; }  /* visually first — default is 0 */
```

> **Accessibility note:** `order` only changes visual order. Screen readers and tab navigation still follow DOM order. Never use `order` to convey meaningful sequence.

### Practical Example: Navbar

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
}

.navbar__logo {
  flex-shrink: 0; /* logo should never shrink */
}

.navbar__links {
  display: flex;
  gap: 24px;
  list-style: none;
}

.navbar__cta {
  margin-left: auto; /* pushes CTA button all the way to the right */
}
```

### Classic Vertical & Horizontal Centering

```css
/* The simplest centering solution in modern CSS */
.container {
  display: flex;
  justify-content: center; /* horizontal center */
  align-items: center;     /* vertical center */
  min-height: 100vh;       /* full viewport height */
}
```

---

## 4. CSS Grid

### Core Concept

CSS Grid is a **two-dimensional** layout system — it lets you control both rows and columns simultaneously. While Flexbox is great for laying items along a single axis (nav bars, card rows), Grid is ideal for full page layouts and any design that requires alignment in both dimensions.

### Activating Grid

```css
.container {
  display: grid;        /* block-level grid container */
  /* display: inline-grid; for inline-level grid */
}
```

### Defining the Grid Structure

#### `grid-template-columns` and `grid-template-rows`

```css
.container {
  /* Three equal columns of 200px each */
  grid-template-columns: 200px 200px 200px;

  /* Three columns using the fr (fraction) unit */
  /* fr distributes available space after fixed sizes are accounted for */
  grid-template-columns: 1fr 2fr 1fr;
  /* → left gets 25%, middle gets 50%, right gets 25% of available width */

  /* Mix of fixed and fluid */
  grid-template-columns: 250px 1fr;
  /* → sidebar is always 250px; content takes the rest */

  /* Two rows: first is 80px (header), second takes remaining space */
  grid-template-rows: 80px 1fr;
}
```

#### `repeat()` — Avoid Repetition

```css
.container {
  /* Instead of writing 1fr four times: */
  grid-template-columns: 1fr 1fr 1fr 1fr;

  /* Use repeat(): */
  grid-template-columns: repeat(4, 1fr);

  /* Repeat a pattern: */
  grid-template-columns: repeat(3, 1fr 2fr); /* 1fr 2fr 1fr 2fr 1fr 2fr */
}
```

#### `minmax()` — Responsive Column Sizes

```css
.container {
  /* Each column is at least 200px and can grow to 1fr */
  grid-template-columns: repeat(3, minmax(200px, 1fr));
}
```

#### `auto-fill` vs `auto-fit` — Responsive Grids Without Media Queries

```css
/* auto-fill: creates as many columns as fit, even if some are empty */
.container {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit: same, but collapses empty tracks to 0 width */
/* Result: on wide screens, items stretch to fill. On narrow, they stack. */
.container {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

> **Interview note:** The `repeat(auto-fit, minmax(200px, 1fr))` combination is the most powerful responsive grid technique — it gives you a fluid, wrapping card grid with zero media queries.

### Gap

```css
.container {
  gap: 24px;          /* equal gap between all rows and columns */
  row-gap: 24px;
  column-gap: 16px;
  gap: 24px 16px;     /* row-gap column-gap */
}
```

### Placing Items

By default, items are placed into the next available cell in row order. You can override this.

#### Spanning Multiple Cells

```css
.item {
  /* grid-column: start / end  (end is exclusive — it's the line number) */
  grid-column: 1 / 3;  /* spans from line 1 to line 3 = occupies columns 1 and 2 */
  grid-row: 1 / 2;     /* occupies row 1 */

  /* Using span keyword — more readable */
  grid-column: span 2; /* spans 2 columns from wherever it's placed */
  grid-row: span 3;    /* spans 3 rows */

  /* Shorthand: grid-area: row-start / col-start / row-end / col-end */
  grid-area: 1 / 1 / 3 / 3;
}
```

### Named Areas — The Most Readable Approach

```css
.container {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr 60px;
  grid-template-areas:
    "header  header"
    "sidebar main  "
    "footer  footer";
  min-height: 100vh;
}

/* Now place items by name — no numbers needed */
.header  { grid-area: header;  }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main;    }
.footer  { grid-area: footer;  }
```

> This is the clearest way to describe a page layout. The `grid-template-areas` value is essentially an ASCII art map of your layout — incredibly readable.

### Alignment in Grid

Grid has the same alignment properties as Flexbox, but they apply to both axes:

| Property | Controls |
|----------|----------|
| `justify-items` | Align items along the row (inline) axis within their cell |
| `align-items` | Align items along the column (block) axis within their cell |
| `justify-content` | Align the entire grid within the container (row axis) |
| `align-content` | Align the entire grid within the container (column axis) |
| `justify-self` | Override `justify-items` for one item |
| `align-self` | Override `align-items` for one item |
| `place-items` | Shorthand for `align-items justify-items` |
| `place-self` | Shorthand for `align-self justify-self` |

```css
/* Center all items within their grid cell */
.container {
  place-items: center; /* align-items: center + justify-items: center */
}
```

### Grid vs Flexbox — When to Use Which

| Use Case | Use |
|----------|-----|
| Page layout (header, sidebar, main, footer) | **Grid** |
| Navigation bar items | **Flexbox** |
| Card grid with equal-width columns | **Grid** |
| Centering a single element | **Flexbox** |
| Unknown number of items in a row | **Flexbox** |
| Items must align across rows AND columns | **Grid** |
| One-dimensional list | **Flexbox** |

> **Interview tip:** The modern answer is "use both together". Grid for macro layout (page structure), Flexbox for micro layout (component internals).

---

## 5. Responsive Design — Media Queries & Bootstrap

### What Is Responsive Design?

Responsive design means your layout **adapts** to the user's screen size and device capabilities. A responsive site looks and works well on a phone, a tablet, and a desktop.

### The Viewport Meta Tag — Critical Foundation

Without this, mobile browsers render the page at desktop width then scale it down:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

- `width=device-width` — set the viewport width to the device's screen width
- `initial-scale=1.0` — don't zoom in or out initially

### CSS Media Queries

Media queries let you apply CSS rules conditionally based on device characteristics.

#### Basic Syntax

```css
@media [media-type] and ([feature]) {
  /* CSS rules that only apply when the condition is true */
}
```

#### Breakpoints

```css
/* Mobile first (min-width) — RECOMMENDED approach */
/* Base styles are for mobile. Then add styles as screen gets larger. */

/* Base (mobile): all screens */
.container {
  padding: 16px;
  flex-direction: column;
}

/* Tablet: 768px and wider */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    flex-direction: row;
  }
}

/* Desktop: 1024px and wider */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Large desktop: 1440px and wider */
@media (min-width: 1440px) {
  .container {
    max-width: 1400px;
  }
}
```

> **Mobile-first vs Desktop-first:** Mobile-first starts with simple styles and adds complexity for larger screens. Desktop-first starts with full styles and uses `max-width` to remove complexity for smaller screens. Mobile-first is preferred because mobile CSS is simpler; it loads fewer styles on devices with limited bandwidth.

#### Other Media Features

```css
/* Orientation */
@media (orientation: landscape) { ... }
@media (orientation: portrait) { ... }

/* Prefer reduced motion (accessibility) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body {
    background: #1a1a1a;
    color: #fff;
  }
}

/* High resolution (retina) displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo {
    background-image: url('logo@2x.png');
  }
}

/* Hover capability (distinguishes touch vs mouse devices) */
@media (hover: none) {
  /* Touch devices — don't rely on :hover for functionality */
}

/* Range syntax (modern CSS) */
@media (600px <= width <= 1200px) {
  /* Between 600px and 1200px */
}
```

#### Logical Operators

```css
/* AND — both conditions must be true */
@media (min-width: 600px) and (orientation: landscape) { ... }

/* OR (comma) — either condition can be true */
@media (max-width: 600px), (orientation: portrait) { ... }

/* NOT */
@media not (min-width: 600px) { ... }
```

### Bootstrap Grid System

Bootstrap uses a **12-column grid** built on Flexbox. You create layouts by assigning class names that say "this column should span X of 12 columns at breakpoint Y".

#### Bootstrap Breakpoints

| Breakpoint | Class Infix | Minimum Width |
|-----------|-------------|---------------|
| Extra small | (none) | `< 576px` |
| Small | `sm` | `≥ 576px` |
| Medium | `md` | `≥ 768px` |
| Large | `lg` | `≥ 992px` |
| Extra large | `xl` | `≥ 1200px` |
| XXL | `xxl` | `≥ 1400px` |

#### Bootstrap Grid Usage

```html
<div class="container">
  <!-- .container adds max-width and auto margins -->

  <div class="row">
    <!-- .row is a flex container with negative margins to offset padding -->

    <!-- Full width on mobile, half width on medium+, one-third on large+ -->
    <div class="col-12 col-md-6 col-lg-4">
      Column 1
    </div>
    <div class="col-12 col-md-6 col-lg-4">
      Column 2
    </div>
    <div class="col-12 col-md-12 col-lg-4">
      Column 3
    </div>
  </div>
</div>
```

> **How to read Bootstrap classes:** `col-md-6` means "at the `md` breakpoint and above, this column spans 6 out of 12 columns (half the row width)". Classes without a breakpoint (`col-6`) apply to all sizes.

#### Bootstrap Auto-Layout Columns

```html
<!-- Equal-width columns without specifying numbers -->
<div class="row">
  <div class="col">Equal</div>
  <div class="col">Equal</div>
  <div class="col">Equal</div>
</div>

<!-- One column takes its natural width; others share the remaining space -->
<div class="row">
  <div class="col">Flex</div>
  <div class="col-auto">Natural width</div>
  <div class="col">Flex</div>
</div>
```

---

## 6. TailwindCSS, Bootstrap & Preprocessors (SASS/LESS)

### TailwindCSS

#### Philosophy

Tailwind is a **utility-first** CSS framework. Instead of writing CSS classes like `.card` or `.btn-primary` that have pre-baked styles, you compose designs directly in HTML using low-level utility classes.

```html
<!-- Traditional CSS approach -->
<div class="card">
  <h2 class="card-title">Hello</h2>
  <p class="card-body">World</p>
</div>

<!-- Tailwind utility-first approach -->
<div class="bg-white rounded-xl shadow-md p-6 max-w-sm">
  <h2 class="text-xl font-bold text-gray-900 mb-2">Hello</h2>
  <p class="text-gray-600">World</p>
</div>
```

> **Why utility-first?** You never need to think of class names. Your CSS file never grows — all styles are in the HTML. You see styles exactly where they're used.

#### Core Utility Categories

```html
<!-- Layout -->
<div class="flex items-center justify-between gap-4">

<!-- Spacing: p(adding) and m(argin) with scale values 1=4px, 2=8px, 4=16px... -->
<div class="p-4 px-6 py-2 mt-8 mb-4 mx-auto">

<!-- Sizing -->
<div class="w-full max-w-lg h-screen min-h-0">

<!-- Typography -->
<p class="text-sm text-gray-600 font-semibold leading-relaxed tracking-wide uppercase">

<!-- Colours (bg = background, text = foreground, border = border) -->
<div class="bg-blue-500 text-white border-2 border-blue-700">

<!-- Borders and Rounded -->
<div class="border rounded-lg rounded-t-none">

<!-- Shadows -->
<div class="shadow shadow-lg shadow-blue-500/50">

<!-- States: hover, focus, active, disabled, etc. -->
<button class="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 active:scale-95">
```

#### Responsive Prefix

```html
<!-- The same breakpoints as media queries, but as class prefixes -->
<!-- Default (no prefix) = mobile. Prefixed = that breakpoint and up. -->
<div class="
  flex-col         /* mobile: column */
  md:flex-row      /* 768px+: row */
  lg:max-w-5xl     /* 1024px+: max-width */
">
```

#### Dark Mode

```html
<!-- With darkMode: 'class' in tailwind.config.js -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
```

#### Tailwind vs Bootstrap

| | Tailwind | Bootstrap |
|---|----------|-----------|
| Approach | Utility-first | Component-first |
| Customisation | Extremely flexible | Requires overrides |
| Bundle size | Tiny (purges unused) | Larger by default |
| Learning curve | Higher initially | Lower (ready-made components) |
| Design consistency | You control it | Provided by the framework |
| Best for | Custom designs | Rapid prototyping |

### Bootstrap

Bootstrap is a **component-first** framework — it gives you pre-styled, ready-to-use components (cards, buttons, modals, navbars).

```html
<!-- Bootstrap's prebuilt button component -->
<button type="button" class="btn btn-primary btn-lg">
  Large Primary Button
</button>

<!-- Bootstrap's card component -->
<div class="card" style="width: 18rem;">
  <img src="img.jpg" class="card-img-top" alt="..." />
  <div class="card-body">
    <h5 class="card-title">Card Title</h5>
    <p class="card-text">Card description here.</p>
    <a href="#" class="btn btn-primary">Go somewhere</a>
  </div>
</div>
```

Bootstrap also includes JavaScript-based components (modals, dropdowns, tooltips) that work without writing any JavaScript yourself.

---

### CSS Preprocessors: SASS / LESS

Preprocessors extend CSS with programming features. You write in the preprocessor syntax, then compile it to standard CSS.

#### SASS (Syntactically Awesome Style Sheets)

SASS has two syntaxes:
- **SCSS** (`.scss`) — looks like CSS with curly braces — most common
- **Indented** (`.sass`) — uses indentation instead of braces

```scss
// ─── Variables ────────────────────────────────────────────────────────────────
// Define once, use everywhere. Changing a variable updates all usages.
$primary-color: #3490dc;
$secondary-color: #ffed4a;
$font-stack: 'Inter', system-ui, sans-serif;
$border-radius: 8px;
$breakpoint-md: 768px;

// ─── Nesting ──────────────────────────────────────────────────────────────────
// Write CSS that mirrors HTML structure. Avoid nesting more than 3 levels deep.
.card {
  background: white;
  border-radius: $border-radius;
  padding: 24px;

  // & refers to the parent selector
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &--featured {
    // Outputs .card--featured (BEM modifier pattern)
    border: 2px solid $primary-color;
  }

  &__title {
    // Outputs .card__title (BEM element pattern)
    font-size: 1.5rem;
    color: #333;
  }

  &__body {
    color: #666;
    margin-top: 8px;
  }
}

// ─── Mixins ───────────────────────────────────────────────────────────────────
// Reusable chunks of CSS, optionally with arguments
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin respond-to($breakpoint) {
  @media (min-width: $breakpoint) {
    @content; // @content is a placeholder for the styles passed to the mixin
  }
}

@mixin button($bg-color, $text-color: white) {
  background-color: $bg-color;
  color: $text-color;
  padding: 10px 20px;
  border: none;
  border-radius: $border-radius;
  cursor: pointer;

  &:hover {
    background-color: darken($bg-color, 10%); // SASS built-in function
  }
}

// Using mixins:
.hero {
  @include flex-center;
  height: 100vh;

  @include respond-to($breakpoint-md) {
    height: 60vh;
  }
}

.btn-primary {
  @include button($primary-color);
}

// ─── Extends / Placeholders ───────────────────────────────────────────────────
// Share a set of CSS properties between selectors
// Unlike mixins, extends output a comma-separated rule (no code duplication)
%message-shared {
  border: 1px solid #ccc;
  padding: 10px;
  color: #333;
}

.message  { @extend %message-shared; }
.success  { @extend %message-shared; border-color: green; }
.error    { @extend %message-shared; border-color: red; }
// Outputs: .message, .success, .error { border: 1px solid #ccc; ... }

// ─── Functions ────────────────────────────────────────────────────────────────
@function rem($px) {
  @return ($px / 16) + rem;
}

h1 { font-size: rem(32); } // Outputs: font-size: 2rem;

// ─── Partials & @use ──────────────────────────────────────────────────────────
// Split SCSS into multiple files. Files starting with _ are "partials"
// and are not compiled into their own CSS file.
// _variables.scss, _mixins.scss, _buttons.scss, etc.

// In main.scss:
@use 'variables';    // Modern — scoped, no global namespace pollution
@use 'mixins';
@use 'components/buttons';
// @import is deprecated in modern SASS; use @use and @forward
```

#### LESS

LESS is similar to SASS but compiles via JavaScript and has slightly different syntax.

```less
// Variables: use @ instead of $
@primary-color: #3490dc;
@border-radius: 8px;

// Nesting: same as SCSS
.card {
  background: white;

  &:hover {
    opacity: 0.9;
  }

  .title {
    font-size: 1.5rem;
  }
}

// Mixins: a class can be used as a mixin (no @mixin keyword needed)
.flex-center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero {
  .flex-center();   // Call the mixin
  height: 100vh;
}

// Operations
@base: 5%;
@filler: @base * 2;       // 10%
@other: @base + @filler;  // 15%
```

> **SASS vs LESS:** SASS has a larger ecosystem, more powerful features (functions, advanced control directives), and is more widely used in modern projects. LESS is simpler and runs in the browser/Node.js natively. Most new projects choose SASS.

---

## 7. CSS Methodologies — BEM

### What Is BEM?

BEM stands for **Block, Element, Modifier**. It is a naming convention for CSS classes that makes your CSS:
- **Predictable** — you can understand a class from its name alone
- **Scalable** — works in large codebases with many developers
- **Reusable** — blocks can be placed anywhere without style conflicts

### The Three Concepts

#### Block

A standalone, reusable component. Meaningful on its own.

```
.card
.nav
.button
.header
.search-form
```

#### Element

A part of a Block that has no standalone meaning. Tied to its Block.

```
.card__title        (title inside a card)
.card__image        (image inside a card)
.nav__item          (item inside navigation)
.search-form__input (input inside search form)
```

**Syntax:** `block-name__element-name` (two underscores)

#### Modifier

A flag on a Block or Element that changes its appearance, state, or behavior.

```
.card--featured     (a featured variant of card)
.button--large      (large variant of button)
.button--disabled   (disabled state of button)
.nav__item--active  (active state of nav item)
```

**Syntax:** `block-name--modifier` (two dashes)

### Full BEM Example

```html
<!-- HTML -->
<div class="card card--featured">
  <img class="card__image" src="photo.jpg" alt="Photo" />
  <div class="card__body">
    <h2 class="card__title">Article Title</h2>
    <p class="card__excerpt">Brief description of the article...</p>
    <a class="card__cta button button--primary" href="#">Read More</a>
  </div>
</div>
```

```css
/* CSS — flat structure, no nesting needed */
.card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.card--featured {
  border: 2px solid #3490dc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.card__body {
  padding: 24px;
}

.card__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.card__excerpt {
  color: #666;
  margin-bottom: 16px;
}

/* Note: .button and .button--primary are their own blocks */
.button {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
}

.button--primary {
  background: #3490dc;
  color: white;
}
```

### BEM Rules

1. **No cascading selectors** — never write `.card .title`. Write `.card__title`. This keeps specificity flat and avoids selector conflicts.

2. **Elements don't have elements** — you don't write `.card__body__title`. You write `.card__title` even if it lives inside `.card__body` in the HTML. Elements belong to the Block, not to other Elements.

3. **Modifiers don't stand alone** — `.button--primary` should always appear alongside `.button`. The modifier doesn't contain all the styles, just the overrides.

4. **Block independence** — a Block should work wherever you place it, regardless of context. It should not depend on other Blocks existing nearby.

### BEM vs Other Methodologies

| Methodology | Core Idea | Best For |
|-------------|-----------|----------|
| **BEM** | Block/Element/Modifier naming | Large teams, design systems |
| **SMACSS** | Categorise rules (Base, Layout, Module, State, Theme) | Organising large stylesheets |
| **OOCSS** | Separate structure from skin | Reusable component libraries |
| **Atomic CSS** / Tailwind | One class per property | Utility-first development |

---

## 8. Web APIs Overview

### What Are Web APIs?

Web APIs are built-in browser interfaces that let JavaScript interact with the browser, the user's device, and the network. They are not part of the JavaScript language itself — they are provided by the browser environment.

### Key Categories of Web APIs

#### DOM API

```javascript
// Selecting elements
const el = document.querySelector('.card');        // first match
const els = document.querySelectorAll('.card');    // NodeList of all matches

// Creating and inserting elements
const div = document.createElement('div');
div.textContent = 'Hello World';
div.classList.add('card', 'card--featured');
document.body.appendChild(div);

// Modifying attributes
el.setAttribute('data-id', '123');
el.getAttribute('data-id'); // "123"
el.removeAttribute('data-id');

// Reading computed styles
const styles = window.getComputedStyle(el);
console.log(styles.fontSize); // "16px"
```

#### Fetch API (Network Requests)

```javascript
// GET request
async function getUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);

    // Always check response.ok before parsing
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// POST request with JSON body
async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  return response.json();
}
```

#### History API (Client-Side Routing)

```javascript
// Push a new URL without page reload (used by React Router, Vue Router)
window.history.pushState({ page: 'about' }, 'About', '/about');

// Replace current entry without adding to history
window.history.replaceState({ page: 'home' }, 'Home', '/');

// Navigate programmatically
window.history.back();
window.history.forward();
window.history.go(-2); // go back 2 steps

// Listen for back/forward button presses
window.addEventListener('popstate', (event) => {
  console.log('Navigation:', event.state);
  // Re-render your page based on current URL
});
```

#### Intersection Observer API (Visibility Detection)

```javascript
// Efficiently detect when elements enter/leave the viewport
// Used for: lazy loading images, infinite scroll, animations on scroll

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Element is visible in the viewport
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Stop watching after it's been seen
      }
    });
  },
  {
    root: null,       // null = viewport
    rootMargin: '0px',
    threshold: 0.1,   // Trigger when 10% of the element is visible
  }
);

document.querySelectorAll('.animate-on-scroll').forEach((el) => {
  observer.observe(el);
});
```

#### Clipboard API

```javascript
// Modern clipboard API (requires HTTPS or localhost)
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Copied!');
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

async function pasteFromClipboard() {
  const text = await navigator.clipboard.readText();
  return text;
}
```

#### ResizeObserver API

```javascript
// Watch for size changes on elements (not just the window)
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    console.log(`Element size: ${width}px × ${height}px`);
  }
});

resizeObserver.observe(document.querySelector('.resizable-container'));
```

---

## 9. Web Workers

### What Problem Do Web Workers Solve?

JavaScript is **single-threaded** — it can only do one thing at a time. Long-running operations (image processing, data parsing, complex calculations) block the main thread, freezing the UI and causing jank.

Web Workers run JavaScript in a **separate background thread**, freeing the main thread to handle user interactions and rendering.

```
Main Thread:  UI events → DOM → Render → UI events → DOM ...
                         ↑ stays responsive
Worker Thread:           ── Heavy computation ──────────────
```

### Creating a Worker

```javascript
// main.js
const worker = new Worker('worker.js');

// Send a message to the worker
worker.postMessage({ data: [1, 2, 3, 4, 5], operation: 'sort' });

// Receive results from the worker
worker.onmessage = (event) => {
  console.log('Result from worker:', event.data);
  displayResult(event.data);
};

// Handle errors
worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

// Terminate the worker when done (frees memory)
// worker.terminate();
```

```javascript
// worker.js — runs in a separate thread

// Workers don't have access to: DOM, window, document
// Workers DO have access to: fetch, setTimeout, WebSockets, IndexedDB, postMessage

self.onmessage = (event) => {
  const { data, operation } = event.data;

  let result;
  if (operation === 'sort') {
    // Imagine this is an expensive operation on millions of items
    result = [...data].sort((a, b) => a - b);
  }

  // Send result back to main thread
  self.postMessage(result);
};
```

### Inline Workers (without a separate file)

```javascript
// Create a worker from a Blob URL — no separate file needed
const workerCode = `
  self.onmessage = function(event) {
    const result = heavyCalculation(event.data);
    self.postMessage(result);
  };

  function heavyCalculation(data) {
    // ...
    return result;
  }
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);
```

### Shared Workers

A `SharedWorker` can be accessed by multiple browser tabs/windows from the same origin.

```javascript
// Multiple tabs can connect to the same SharedWorker
const sharedWorker = new SharedWorker('shared-worker.js');
sharedWorker.port.onmessage = (event) => {
  console.log(event.data);
};
sharedWorker.port.postMessage('Hello from tab 1');
```

### Transferable Objects

By default, data is **copied** between the main thread and workers (structured cloning). For large data like ArrayBuffers, you can **transfer** ownership instead (zero-copy):

```javascript
const buffer = new ArrayBuffer(1024 * 1024 * 32); // 32MB

// Transfer (not copy) the buffer to the worker
// After this, buffer in the main thread is detached and unusable
worker.postMessage({ data: buffer }, [buffer]);
```

### Service Workers

Service Workers are a special type of worker that act as a **programmable network proxy**. They enable:
- Offline-first apps
- Background sync
- Push notifications
- Caching strategies

```javascript
// Register a service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}
```

```javascript
// sw.js — Service Worker file
const CACHE_NAME = 'v1';
const ASSETS = ['/index.html', '/styles.css', '/app.js'];

// Install: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch: serve from cache if available, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

### Worker Limitations

- No access to the DOM (`document`, `window`)
- No access to `localStorage` (use `IndexedDB` instead)
- Same-origin restrictions for loading the worker script
- Communication is asynchronous only

---

## 10. Geolocation API

### What Is the Geolocation API?

The Geolocation API allows browsers to determine the user's physical location using GPS (on mobile), Wi-Fi, cell towers, or IP address. It requires **explicit user permission**.

### Getting Current Position

```javascript
// navigator.geolocation is the entry point
if (!navigator.geolocation) {
  console.error('Geolocation is not supported by your browser.');
  return;
}

navigator.geolocation.getCurrentPosition(
  // Success callback
  (position) => {
    const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
    const timestamp = position.timestamp; // Unix timestamp in milliseconds

    console.log(`Lat: ${latitude}, Lon: ${longitude}`);
    console.log(`Accuracy: ±${accuracy} metres`);
  },

  // Error callback
  (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('User denied the request for geolocation.');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location information is unavailable.');
        break;
      case error.TIMEOUT:
        console.error('The request to get user location timed out.');
        break;
      default:
        console.error('An unknown error occurred.');
    }
  },

  // Options
  {
    enableHighAccuracy: true, // Use GPS if available (slower but more precise)
    timeout: 10000,           // Fail after 10 seconds
    maximumAge: 60000,        // Accept a cached position up to 1 minute old
  }
);
```

### Watching Position (Continuous Updates)

```javascript
// watchPosition returns an ID that you can use to stop watching
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    // Called every time the user's position changes
    updateMapMarker(position.coords.latitude, position.coords.longitude);
  },
  (error) => {
    console.error('Watch error:', error.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
  }
);

// Stop watching (important for battery life)
function stopTracking() {
  navigator.geolocation.clearWatch(watchId);
}
```

### Practical Example: Show User on a Map

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Location</title>
  <!-- Using Leaflet.js, a popular open-source map library -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9/dist/leaflet.css" />
</head>
<body>
  <div id="map" style="height: 400px;"></div>
  <button id="locate-btn">Find My Location</button>

  <script src="https://unpkg.com/leaflet@1.9/dist/leaflet.js"></script>
  <script>
    // Initialise map centred on India
    const map = L.map('map').setView([20.5937, 78.9629], 5);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    document.getElementById('locate-btn').addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Pan map to user's location
          map.setView([latitude, longitude], 15);

          // Add a marker
          L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(`You are here (±${Math.round(accuracy)}m)`)
            .openPopup();

          // Draw accuracy circle
          L.circle([latitude, longitude], { radius: accuracy })
            .addTo(map);
        },
        (error) => {
          alert(`Error: ${error.message}`);
        }
      );
    });
  </script>
</body>
</html>
```

### Privacy and Security Notes

- Geolocation requires **HTTPS** in production (HTTP only works on localhost)
- The browser shows a **permission prompt** — the user must explicitly allow it
- Permission is remembered per origin and can be revoked in browser settings
- Always provide a graceful fallback for when permission is denied
- Don't request geolocation on page load — wait for an explicit user action

---

## 11. Local Storage & Session Storage

### The Web Storage API

The Web Storage API provides two storage mechanisms for persisting data in the browser without needing cookies or a server.

| | `localStorage` | `sessionStorage` |
|---|----------------|-----------------|
| **Lifetime** | Persists forever (until cleared) | Cleared when the tab/window closes |
| **Scope** | All tabs & windows on the same origin | Only the tab that created it |
| **Capacity** | ~5–10 MB (varies by browser) | ~5 MB |
| **Access** | Synchronous | Synchronous |
| **Storage type** | Key-value (strings only) | Key-value (strings only) |

### The API — Same for Both

```javascript
// ─── localStorage ─────────────────────────────────────────────────────────────

// Store a value (must be a string)
localStorage.setItem('username', 'aditya');

// Retrieve a value (returns null if key doesn't exist)
const username = localStorage.getItem('username'); // "aditya"

// Remove a specific key
localStorage.removeItem('username');

// Clear ALL keys (be careful!)
localStorage.clear();

// Get number of stored items
console.log(localStorage.length); // e.g. 3

// Get key name at index (useful for iterating)
const key = localStorage.key(0);

// ─── sessionStorage — identical API ───────────────────────────────────────────
sessionStorage.setItem('tempToken', 'abc123');
const token = sessionStorage.getItem('tempToken');
sessionStorage.removeItem('tempToken');
```

### Storing Objects (JSON Serialisation)

Web Storage only stores **strings**. To store objects or arrays, serialise with JSON:

```javascript
// Storing an object
const user = {
  id: 1,
  name: 'Aditya',
  preferences: { theme: 'dark', language: 'en' },
};

localStorage.setItem('user', JSON.stringify(user));

// Reading the object back
const stored = localStorage.getItem('user');
const parsedUser = stored ? JSON.parse(stored) : null;
console.log(parsedUser.name); // "Aditya"

// Safe helper functions
function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Can throw QuotaExceededError when storage is full
    console.error('Storage write failed:', error);
  }
}

function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch (error) {
    // JSON.parse throws on malformed data
    console.error('Storage read failed:', error);
    return defaultValue;
  }
}
```

### The `storage` Event

When `localStorage` changes in one tab, other tabs from the same origin receive a `storage` event:

```javascript
// This fires in OTHER tabs/windows when localStorage changes
// It does NOT fire in the tab that made the change
window.addEventListener('storage', (event) => {
  console.log('Key changed:', event.key);
  console.log('Old value:', event.oldValue);
  console.log('New value:', event.newValue);
  console.log('URL that changed it:', event.url);
  console.log('Storage area:', event.storageArea); // localStorage or sessionStorage

  if (event.key === 'auth-token' && event.newValue === null) {
    // User logged out in another tab — log out here too
    logout();
  }
});
```

> **Practical use:** This is how you can sync a "dark mode" toggle across multiple open tabs, or log a user out of all tabs when they click logout in one.

### When to Use Each

**Use `localStorage` for:**
- User preferences (theme, language, font size)
- Cached API responses (with a timestamp for invalidation)
- Shopping cart contents (persist across sessions)
- Form drafts / autosave

**Use `sessionStorage` for:**
- Wizard/multi-step form state (should reset when user closes tab)
- One-time UI state (e.g., "has the user seen this tutorial in this session?")
- Temporary authentication tokens (more secure than localStorage)

### Security Considerations

```javascript
// ⚠️ NEVER store in localStorage:
localStorage.setItem('password', '...');        // NEVER
localStorage.setItem('creditCard', '...');      // NEVER
localStorage.setItem('ssn', '...');             // NEVER

// ⚠️ Be careful with auth tokens:
// Any JavaScript on your page (including third-party scripts) can read localStorage.
// If your site has an XSS vulnerability, attackers can steal tokens.
// For high-security apps: use httpOnly cookies instead, which JS cannot access.

// localStorage is NOT secure storage. Store only non-sensitive data.
```

### Checking Storage Availability

```javascript
function isStorageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch (e) {
    // Storage might be full or disabled (private browsing mode in some browsers)
    return (
      e instanceof DOMException &&
      (e.code === 22 ||
        e.code === 1014 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      storage && storage.length !== 0
    );
  }
}

if (isStorageAvailable('localStorage')) {
  // Safe to use localStorage
}
```

---

## Quick-Reference Interview Cheat Sheet

### Critical Rendering Path
- **Steps:** Bytes → DOM, CSS bytes → CSSOM → Render Tree → Layout → Paint → Composite
- CSS is **render-blocking**; JavaScript is **parser-blocking** by default
- `defer` executes after parsing; `async` executes as soon as downloaded
- Use `transform`/`opacity` for animations to stay on the compositor thread

### Semantic HTML
- `<article>` = self-contained content; `<section>` = themed grouping
- `<strong>` = importance; `<em>` = stress emphasis; `<b>` = attention (no importance)
- One `<main>` per page; `<header>` and `<footer>` can appear multiple times
- Semantic HTML = better SEO + accessibility + maintainability

### Flexbox
- **1D layout** (one axis at a time)
- `justify-content` = main axis; `align-items` = cross axis
- `flex: 1` = `flex-grow: 1, flex-shrink: 1, flex-basis: 0`
- `align-content` only applies with multiple lines (flex-wrap)

### Grid
- **2D layout** (rows AND columns)
- `fr` unit = fraction of available space
- `repeat(auto-fit, minmax(200px, 1fr))` = responsive grid with no media queries
- Named areas = most readable layout approach

### Responsive Design
- Mobile-first = base styles for mobile, add complexity for larger screens
- Always include viewport meta tag
- Bootstrap = 12-column grid, 5 breakpoints (sm/md/lg/xl/xxl)

### BEM
- `.block__element--modifier`
- No cascading selectors — keeps specificity flat
- Modifiers always appear alongside the base class
- Elements belong to the Block, not to other Elements

### Web Workers
- Solve single-threaded JS blocking the UI
- No DOM access in workers; communicate via `postMessage`
- Service Workers = network proxy (offline, caching, push notifications)

### Geolocation
- Requires user permission + HTTPS
- `getCurrentPosition()` = one-time; `watchPosition()` = continuous
- Always handle all three error codes (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)

### Web Storage
- `localStorage` = persists forever, shared across tabs
- `sessionStorage` = cleared on tab close, tab-specific
- Values are strings — always use `JSON.stringify/parse` for objects
- Never store passwords, credit cards, or sensitive data in Web Storage

---

*Last updated: April 2026 | For blog use — feel free to republish with attribution.*
