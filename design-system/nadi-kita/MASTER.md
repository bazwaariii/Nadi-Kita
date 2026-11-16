# Nadi Kita Design System (MASTER)

Source: generated with the `ui-ux-pro-max` skill (`--design-system`, query "blood donation healthcare scheduling public service") and refined with the `frontend-design` skill.
Generator output: style **Accessible & Ethical**, font **Atkinson Hyperlegible**, pattern **Minimal single column** for public pages, **Data-Dense Dashboard** for the UTD console.
Override: the generator proposed navy + blue. The client banned blue, so the palette below is a neutral stone + blood red palette. All other generator rules apply.

## 1. Subject, audience, job

- Subject: scheduled voluntary blood donation at UTD PMI Kota Surabaya.
- Audience: the general public (17 to 60 years old, many on phones), and UTD staff on desktop.
- Primary job (public): see which blood type is running low today, then book a 30 minute donation slot.
- Primary job (staff): keep stock current, verify KTP PDFs, run the QR queue.

## 2. Color tokens (Tailwind `@theme` in `web/src/app/globals.css`)

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F6F6F5` | Page background (flat, no gradient) |
| `white` | `#FFFFFF` | Surfaces, panels, inputs |
| `ink` | `#1C1917` | Primary text, headings |
| `ink-soft` | `#44403C` | Body text, secondary text |
| `ink-muted` | `#6B6560` | Helper text, captions (5.6:1 on white) |
| `line` | `#E7E5E4` | Dividers, panel borders |
| `line-strong` | `#D6D3D1` | Hover borders, table header border |
| `field` | `#8F8A85` | Input and control borders (3:1 non-text contrast) |
| `brand` | `#C8102E` | Primary actions, critical stock, active nav marker (5.9:1 on white) |
| `brand-strong` | `#9F0D24` | Hover/pressed brand, brand text on tint |
| `blush` | `#FCECEE` | Brand tint: selected rows, active nav background |
| `ok-ink` / `ok-fill` | `#15803D` / `#EAF6EE` | Stock "Aman", success states |
| `warn-ink` / `warn-fill` | `#9A5500` / `#FDF3E3` | Stock "Menipis", warnings |
| `apricot` | `#E89B2D` | Amber gauge fill for low stock |
| `danger-ink` / `danger-fill` | `#9F0D24` / `#FCECEE` | Errors, destructive |

Rules
- Never use blue, indigo, sky, cyan or slate classes.
- Status is never color alone: always icon + text label.
- No gradients, no glows, no tinted near-black.

## 3. Typography

- Family: **Atkinson Hyperlegible** (400, 700) for everything, loaded with `next/font/google` as `--font-sans`. `--font-mono` maps to the same family, so data labels are not monospace.
- Scale (px): 13 caption, 14 small, 16 body, 18 lead, 22 h3, 28 h2, 36 / 44 h1 (mobile / desktop).
- Line height: 1.55 body, 1.2 headings. Line length under 75 characters.
- Sentence case everywhere. No ALL CAPS labels, no tracked-out eyebrows, no single highlighted word inside a headline.
- Numbers that change (stock, quotas) use `tabular-nums`.

## 4. Shape, depth, spacing

- Radius: `rounded-input` 8px (buttons, inputs, chips), `rounded-panel` 12px (panels, modals), `rounded-full` only for avatars and the logo mark. `rounded-pill` resolves to 8px.
- Depth: flat panels with a 1px `line` border. Shadow (`--shadow-float`) only for toasts, menus and modals.
- Spacing: 4px base. Public pages: 16 / 24 / 40 / 64. Console: 8 / 12 / 16 / 24.
- Touch targets: 44px minimum on public and donor pages, 36px minimum in the dense console.

## 5. Layout

Public
```
[header: logo | Stok  Jadwal  Cek kelayakan  Cara donor | Masuk  (Daftar)]
[hero: headline + 2 CTAs + address/hours  |  stock board: 8 blood-bag gauges]
[jadwal: day tabs, 30 min slot grid, booking bar]
[cek kelayakan: form left, result right]
[cara donor: 4 real steps (numbered because it is a sequence)]
[FAQ accordion]
[footer: address, hours, links]
```
Left aligned text. Max width 1200px.

Console (UTD staff)
```
[sidebar 240px: logo, nav (active = blush bg + 3px brand bar), officer card, logout]
[page header: title + one-line description + primary action]
[KPI strip] [dense table / panel grid]
```

Donor
```
[header 64px: logo, blood group, nav, logout] / [mobile bottom nav, 4 items]
[single column 840px]
```

## 6. Signature element

The stock board drawn as eight **blood-bag gauges** (vertical fill level with a safe-level line). This is the one bold element. Everything around it stays quiet.

## 7. Motion

- One orchestrated moment: gauges fill from 0 on first paint (500ms, 40ms stagger).
- State transitions 150 to 200ms (hover, press, accordion, tab).
- No fade-up on every section, no hover lift on cards.
- `prefers-reduced-motion` disables all of it.

## 8. Copy

- Indonesian, plain verbs, sentence case. Buttons say what happens ("Pesan jadwal", "Simpan perubahan").
- No em dash `—`, no middle-dot meta strings, no `→` appended to buttons.
- Errors say what happened and how to fix it.

## 9. Pre-delivery checklist (ui-ux-pro-max)

- [ ] No emoji icons (Lucide only), decorative icons `aria-hidden`
- [ ] `cursor-pointer` + hover state on all clickables, 150 to 300ms
- [ ] Text contrast 4.5:1, control borders 3:1
- [ ] Visible focus ring (2px brand-strong, 2px offset)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375, 768, 1024, 1440, no horizontal scroll
- [ ] Labels visible above inputs, errors next to the field

