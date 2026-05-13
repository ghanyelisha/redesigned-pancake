# Bamenda Transit Cloud — Landing Page (v1)

A single-page Next.js landing site demonstrating the UI for a **cloud-based travel booking system** with **live bus tracking** and **integrated customer support** for Bamenda inter-urban transportation. Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS** for an academic demo and prototype presentation.

---

## Summary

This repository ships a **production-like** landing experience for the **MyBus / Bamenda Transit Cloud** concept: search trips, book seats online, track buses live, and reach support quickly—framed for passengers, operators, and **lecturers or evaluators** reviewing the work.

**Scope (v1):** one App Router page (`app/page.tsx`) with static content. **Out of scope:** backend, authentication, extra routes, APIs, databases, booking flows, admin panels, and form submission logic.

---

## Contents

| Path | Description |
|------|-------------|
| `app/page.tsx` | Single Next.js page: full landing UI (navbar, hero, trust strip, features, how-it-works, benefits, overview, CTA, contact, footer). |
| `app/layout.tsx` | Root layout, metadata, and global font setup. |
| `app/globals.css` | Tailwind layers and smooth scrolling. |
| `tailwind.config.ts` | Tailwind theme extensions (colors, animations). |
| `public/` | Optional static assets (e.g. `logo.svg`, favicons, local images). |
| `README.md` | This file. |

---

## Getting started (local)

### Prerequisites

- **Node.js 18+** (LTS recommended for Next.js 14+)
- **npm**, **yarn**, or **pnpm**

### Clone and install

```bash
git clone <repo-url>
cd <repo-folder>
npm install
```

Use `yarn` or `pnpm install` if you prefer.

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

---

## Project structure (key files)

- **`app/page.tsx`** — Single entry for the marketing UI:
  - Sticky header / navbar with logo text and in-page anchors
  - Hero with headline, CTAs, and mock product preview (route, seats, live status, support)
  - Trust / value strip (key value points)
  - Features grid (six cards with icons)
  - How it works (four steps / timeline-style layout)
  - Benefits split (passengers vs operators)
  - Project overview (short academic description)
  - Final CTA, contact block, footer
- **`app/globals.css`** — Tailwind directives and global behaviors (e.g. smooth scrolling).
- **`tailwind.config.ts`** — Theme extensions (brand colors, `fade-up` keyframes).
- **`next.config.mjs`** — Next.js config (e.g. `images.remotePatterns` if remote placeholders are used).
- **`public/logo.svg`** *(optional)* — Brand mark for header/footer if you add one later.

---

## Design and implementation notes

- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, **lucide-react** for icons.
- **Accessibility:** Semantic sections, descriptive landmarks where appropriate, keyboard-navigable links, visible **focus** styles on interactive elements.
- **Responsiveness:** Mobile-first layout; grids and spacing scale at `sm` / `lg` breakpoints.
- **Content model:** Copy and lists live in **arrays/objects** at the top of `app/page.tsx` for straightforward edits.
- **Images:** The page can run without external assets; any remote placeholders should use **`next/image`** with hosts allowed in `next.config.mjs`.
- **Motion:** Light reveal animations respect **`prefers-reduced-motion`** (`motion-reduce:` utilities where applied); prefer transitions over heavy animation.

---

## How to edit content

1. **Copy and sections** — Edit the `const` arrays/objects (`navLinks`, `trustPoints`, `features`, `steps`, benefit lists, etc.) near the top of `app/page.tsx`.
2. **Icons** — Change `lucide-react` imports and the `icon` field on each feature entry.
3. **Theme** — Adjust `tailwind.config.ts` (`theme.extend.colors`, `keyframes`, `animation`) or utility classes in `page.tsx` for spacing and palette.
4. **Site metadata** — Update `title` / `description` in `app/layout.tsx`.

---

## Deployment

The landing route is **static-friendly** and can be hosted on **Vercel**, **Netlify**, or any platform that supports **Next.js** builds.

| Step | Command / action |
|------|------------------|
| Build | `npm run build` |
| Run locally after build | `npm run start` |
| Recommended | **Vercel** — connect the repo; default Next.js settings usually suffice for App Router. |

---

## Developer tips

- Keep **v1** as a **single-file landing page** (`app/page.tsx`) unless you deliberately split presentational pieces into `app/components/`.
- **Do not** add API routes, server actions tied to persistence, or auth unless the project scope changes.
- Iterate quickly with Tailwind in **`npm run dev`** (JIT).
- Use **`next/image`** only for **trusted** domains (configure `remotePatterns`) or **local** files under `public/` to avoid broken or blocked images in CI and sandboxes.

---

## Checklist before submission

- [ ] Hero mock card looks balanced on **mobile** and **desktop**.
- [ ] All **anchor links** scroll to the correct sections; smooth scroll behaves as expected.
- [ ] **Keyboard** navigation works; **focus outlines** remain visible.
- [ ] **`prefers-reduced-motion`** does not leave content hidden or stuck animating.
- [ ] Run **Lighthouse**: aim for **LCP under 2.5s** on a cold load where possible; **accessibility score above 90**.

---

## Suggested README sections (later)

- **Contributing** — if the repository accepts external contributions.
- **License** — see below; pick MIT or CC BY for academic reuse as appropriate.
- **Contact** — author emails, supervision details, or registration numbers.
- **Live demo** — URL after deployment (Vercel / Netlify).

---

## Authors

- **NDIYUO ÉMILE NCHUM** — UBa23TP0625  
- **LONGHO FRANCIS JAM** — UBa23TP0628  

---

## License

**MIT** (suggested). Update this section if your institution requires a different license or attribution.
