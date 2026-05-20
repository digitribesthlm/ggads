# Design System — AdsPortal

## Product Context
- **What this is:** Google Ads client portal for creative approval and change tracking
- **Who it's for:** Account managers and clients at a Google Ads agency
- **Project type:** Web app (dashboard + forms + review flows)
- **Mood:** Professional, functional, stable — a tool you trust with your ad campaigns

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — function-first, calm density, minimal decoration
- **Decoration level:** Minimal — typography and spacing do the work
- **Reference:** Linear, Notion, Vercel dashboard

## Typography
- **Display/Body/UI/Data:** Geist (already loaded via next/font)
- **Code:** Geist Mono
- **Scale:** text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px)
- **Weights:** regular (400), medium (500), semibold (600), bold (700)
- **Body minimum:** 14px — no text below 14px for body copy. Labels and meta can use 10-12px

## Color
```css
--color-brand:       #FF5C35;  /* Primary CTA, links, accents */
--color-brand-hover: #E8502A;  /* Button hover, active states */
--color-brand-light: #FFF5F2;  /* Highlight backgrounds, empty states */
--color-slate:       #33475B;  /* Primary text, headings */
--color-slate-light: #516F90;  /* Secondary text, labels, meta */
--color-warm-gray:   #F9F8F6;  /* Page background */
```
- **Semantic:** success green (#16a34a / #dcfce7 bg), warning yellow (#ca8a04 / #fef9c7 bg), error red (#dc2626 / #fee2e2 bg)
- **Borders:** gray-100 (#f3f4f6), gray-200 (#e5e7eb)
- **Dark mode:** Not in scope for Phase 1

## Spacing
- **Base unit:** 4px (Tailwind default)
- **Density:** Comfortable — generous padding on cards, breathing room between sections
- **Page:** max-width 5xl, px-8 py-8 on main content
- **Card padding:** p-4 (16px) or p-5 (20px) depending on content density
- **Section gap:** mb-6 or mb-8 between major sections

## Component Patterns
- **Cards:** bg-white, border border-gray-200, rounded-xl, shadow-sm
- **Table rows:** border-b border-gray-50, hover:bg-warm-gray
- **Buttons primary:** bg-brand text-white rounded-xl font-semibold hover:bg-brand-hover shadow-sm
- **Buttons secondary:** border border-gray-300 text-slate rounded-xl hover:bg-gray-50
- **Badges/pills:** rounded-full, px-2.5 py-0.5, text-xs font-semibold
  - Active: bg-green-100 text-green-700
  - Paused: bg-yellow-100 text-yellow-700
  - Type: bg-gray-100 text-slate-light
  - Pending: bg-orange-100 text-orange-700
  - Rejected: bg-red-100 text-red-800
- **Type badge:** inline-block px-2.5 py-0.5 bg-gray-100 rounded-xl text-xs font-medium text-slate-light
- **Form inputs:** border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand/20 focus:border-brand
- **Empty states:** bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-slate-light
- **Loading states:** Same as empty, text says "Loading..."
- **Error states:** bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700

## Layout
- **Sidebar:** 240px fixed left, bg-white, border-r border-gray-100
- **Header:** flex between sidebar edge and content edge, user switcher right-aligned
- **Content:** flex-1, p-8, max-w-5xl
- **Grid:** 1/2/3 columns responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3), gap-5
- **Border radius:** 12px (rounded-xl) for cards, 8px (rounded-lg) for inputs, full for pills

## Motion
- **Approach:** Minimal-functional — hover states and transitions only
- **Hover:** shadow-sm → shadow-md on cards, bg-white → bg-warm-gray on table rows
- **Button:** hover:bg-brand-hover transition-colors
- **Duration:** 150ms (Tailwind default transition)

## AI Slop Blacklist (do NOT use)
- Purple/violet/indigo gradients
- 3-column icon-in-circle grids
- Centered everything
- Decorative blobs or wavy dividers
- Emoji as design elements
- stock-photo-style hero sections
- Inter, Roboto, Arial (already using Geist)
