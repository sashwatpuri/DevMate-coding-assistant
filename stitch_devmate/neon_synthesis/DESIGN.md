# Design System Specification: The Kinetic Ether

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Ether."** 

This is not a static interface; it is a high-performance environment designed to feel like a living extension of the developer's intent. We are moving away from the "boxy" utility of traditional IDEs toward an editorial, immersive dashboard. By leveraging the interplay between deep space (`surface`) and luminous data (`primary` & `secondary`), we create a sense of infinite depth. 

The layout prioritizes **intentional asymmetry**. We break the rigid grid by allowing floating glass modules to overlap and breathe, using extreme typography scales to establish a clear, authoritative hierarchy. This is where high-tech precision meets premium editorial craft.

---

## 2. Colors & Atmospheric Depth
Our palette is rooted in the contrast between the void and the spark. We use neon accents not as decoration, but as functional signifiers of energy and focus.

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders are strictly prohibited for sectioning.** Structural boundaries must be defined exclusively through background shifts. For example, a sidebar should be defined by placing a `surface_container_low` section against the main `surface` background. This creates a sophisticated, "molded" look rather than a segmented one.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create nested depth:
- **Base Layer:** `surface` (#10141a) for the primary application background.
- **Structural Zinc:** `surface_container_low` (#181c22) for large navigation areas.
- **Active Modules:** `surface_container_high` (#262a31) for cards or floating panels.
- **Interactive Focus:** `surface_container_highest` (#31353c) for elements requiring immediate attention.

### The Glass & Gradient Rule
For floating elements (modals, tooltips, or command palettes), use **Glassmorphism**. Apply a semi-transparent `surface_container` color with a `backdrop-filter: blur(20px)`. 
Main CTAs and hero highlights should utilize a **Signature Texture**: a linear gradient from `primary` (#c3f5ff) to `primary_container` (#00e5ff) at a 135-degree angle. This provides a "soul" to the UI that flat colors cannot replicate.

---

## 3. Typography: The Editorial Edge
Typography is our primary tool for conveying "Next-Generation" authority. We pair a high-character geometric sans for headlines with a highly legible sans for utility.

- **Display & Headlines:** Use **Space Grotesk**. This font’s technical quirks provide a "human-made tech" feel. Use `display-lg` (3.5rem) for hero moments to create an editorial, magazine-like impact.
- **UI & Body:** Use **Inter**. It is the gold standard for interface legibility. Stick to `body-md` (0.875rem) for standard text to maintain a crisp, professional density.
- **Code Blocks:** Utilize a crisp monospace (like JetBrains Mono) for all code snippets. Code is the hero of this application; it should feel high-contrast and perfectly aligned.

The typographic hierarchy should be dramatic. Don't be afraid of the "Small Label / Big Title" contrast to guide the user's eye through complex data.

---

## 4. Elevation & Depth
In this system, depth is a functional tool, not just an aesthetic choice. We use **Tonal Layering** to convey hierarchy.

- **The Layering Principle:** Instead of shadows, achieve lift by stacking. Place a `surface_container_lowest` (#0a0e14) card inside a `surface_container_low` (#181c22) container to create a "recessed" look, or vice versa for a "lifted" look.
- **Ambient Shadows:** When an element must float (e.g., a floating action button), use a shadow with a blur radius of at least `32px` at `8%` opacity. The shadow color must be a tinted version of `surface_tint` (#00daf3) to mimic the way light reflects off neon surfaces.
- **The "Ghost Border":** If accessibility requires a container boundary, use a "Ghost Border"—the `outline_variant` (#3b494c) token at `15%` opacity. Never use 100% opaque borders.
- **Glassmorphism:** Use `surface_variant` (#31353c) at `40%` opacity with a heavy backdrop blur to allow background gradients to bleed through, making the UI feel integrated into the "Ether."

---

## 5. Components

### Buttons
- **Primary:** Gradient background (`primary` to `primary_container`) with `on_primary` (#00363d) text. Rounded corners at `full` (9999px) for a pill shape.
- **Secondary:** Transparent background with a `Ghost Border` and `primary` text.
- **States:** On hover, apply a `primary_fixed` (#9cf0ff) outer glow (drop-shadow) to simulate the button "powering up."

### Input Fields
- **Styling:** Use `surface_container_highest` for the background. No border.
- **Focus State:** The container background shifts to `surface_bright` (#353940) with a subtle `primary` glow on the bottom edge only.
- **Typography:** Labels use `label-md` in `on_surface_variant` (#bac9cc).

### Code Editor & Panels
- **Container:** Use `surface_container_lowest` for the editor well to give it a "sunken" feel, emphasizing that this is where the work happens.
- **Spacing:** Use the `Spacing Scale 4` (0.9rem) for internal padding to ensure the code has room to breathe.
- **Separation:** Forbid the use of divider lines. Separate panels using a `2.5` (0.5rem) gap or a shift from `surface_container_low` to `surface_container_high`.

### Chips & Tags
- **Selection Chips:** Use `secondary_container` (#5203d5) with `on_secondary_container` (#c0acff) text.
- **Visuals:** Corners must be `md` (0.75rem) to maintain the "high-tech" rounded language.

---

## 6. Do's and Don'ts

### Do
- **Do** use large amounts of negative space (`Spacing Scale 16` or `20`) between major functional sections.
- **Do** use `primary` and `secondary` glows to highlight active AI processes or data flows.
- **Do** lean into the "Glass" effect for temporary overlays like command palettes.
- **Do** ensure that typography remains the primary anchor of the layout; keep it sharp and high-contrast.

### Don't
- **Don't** use 1px solid borders for layout—it kills the "high-end" fluidity.
- **Don't** use default black shadows. Shadows must always be tinted with the glow of the interface.
- **Don't** crowd the interface. If a screen feels "busy," increase the surface-container contrast and the spacing.
- **Don't** use sharp 0px corners. Every element should feel engineered yet approachable, using the `DEFAULT` (0.5rem) or `lg` (1rem) roundedness tokens.