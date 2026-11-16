# UI overhaul brief for page workers

You are restyling part of the Nadi Kita web app (Next.js 15 App Router, React 19, Tailwind CSS v4, lucide-react) at
`C:\Users\ASUS\Downloads\Project Donor Darah\web`. This is a TOTAL visual overhaul driven by the `ui-ux-pro-max` and `frontend-design` skills.

## Read first
1. `C:\Users\ASUS\Downloads\Project Donor Darah\design-system\nadi-kita\MASTER.md` (the design system, source of truth)
2. `web\src\app\globals.css` (tokens, already done)
3. `web\src\components\ui\StatusChip.tsx` (exports `Chip`, `StockStatusChip`, `BookingStatusChip`, `InvitationStatusChip`, already done). Reuse `Chip` for any status badge: `<Chip tone="ok|warn|danger|brand|neutral|info" Icon={LucideIcon} size="sm|md">Text</Chip>`
4. `web\src\components\ui\Navigation.tsx` (already done, for visual reference of the new style)

## Hard rules
- Change ONLY presentation: JSX structure, Tailwind classes, user-facing copy. Do NOT change data fetching, server actions, API calls, state logic, props contracts, exports, types, or routes. Every existing feature must keep working.
- Edit ONLY the files assigned to you. Shared components (Navigation, Logo, StatusChip, LiveStockBoard, StockPill, ScrollReveal, globals.css) are owned by the coordinator; do not edit them.
- Never run `npm run build`, `next dev` or `next start` (other agents work in the same folder). To verify, run `npx tsc --noEmit` inside `web` and fix any type errors in YOUR files.
- Absolutely no em dash character (U+2014) anywhere, in code or copy. Also no en dash used as a sentence dash.
- No blue/indigo/sky/cyan/slate/rose/pink raw Tailwind palette classes. Use tokens only: `brand`, `brand-strong`, `blush`, `canvas`, `white`, `ink`, `ink-soft`, `ink-muted`, `line`, `line-strong`, `field`, `ok-ink`, `ok-fill`, `warn-ink`, `warn-fill`, `danger-ink`, `danger-fill`, `apricot`.
- No large dark surfaces (no `bg-ink` panels, banners, headers, toasts). The client wants clean, light, professional. `bg-ink` is allowed only for tiny avatars.

## Remove these AI-template tells (frontend-design skill)
- ALL CAPS labels and tracked eyebrows (`uppercase`, `tracking-wide`, `tracking-wider`, all-caps strings like "LAYAK DONOR"). Use sentence case.
- `font-mono` on data or labels. Use `tabular-nums` for changing numbers instead.
- Middle-dot meta strings ("A • B • C", "A · B"). Use separate elements, commas, or a small definition list.
- `ArrowRight` (or "→") appended to button/link text. Keep icons only when they carry meaning and put them before the label.
- Title Case Copy On Buttons. Use sentence case with a plain verb: "Simpan perubahan", "Pesan jadwal", "Verifikasi KTP".
- Decorative eyebrow labels above every heading; gradients; glows; shadows on ordinary cards; hover lift (`-translate-y`, `hover:shadow`); identical rounded cards for everything.
- Text smaller than 12px (`text-[10px]`, `text-[11px]` become `text-xs`).
- Emoji as icons.

## Component recipes (copy these)
Primary button (console h-10, public/donor h-11 or h-12):
`inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60`
Secondary button:
`inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas`
Quiet/ghost button: `... rounded-input px-3 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink`
Destructive: `... rounded-input border border-line bg-white text-danger-ink hover:border-danger-ink hover:bg-danger-fill`
Icon-only button: min `h-10 w-10` (44px on public/donor), must have `aria-label`.

Panel: `rounded-panel border border-line bg-white` (no shadow). Panel header row: `flex items-center justify-between gap-3 border-b border-line px-4 py-3` (console) or `px-5 py-4` (public), title `text-[17px] font-bold text-ink`, optional description `text-sm text-ink-muted`.

Field:
```
<label htmlFor="x" className="block text-sm font-bold text-ink">Nama lengkap</label>
<input id="x" className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none" />
<p className="mt-1 text-sm text-ink-muted">Helper text</p>
<p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-danger-ink"><TriangleAlert size={14} aria-hidden="true" />Error next to field</p>
```
Selects use the same classes as inputs. Checkboxes: `h-5 w-5 accent-[#C8102E]`.

Segmented tabs / filters: container `inline-flex rounded-input border border-line bg-canvas p-1`, item `h-9 rounded-[6px] px-3 text-sm font-medium`, active `bg-white font-bold text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]`, inactive `text-ink-soft hover:text-ink`.

Table (console, dense):
wrapper `overflow-x-auto rounded-panel border border-line bg-white`; `table w-full text-sm`; thead row `border-b border-line-strong bg-canvas text-left`, th `h-10 px-3 text-[13px] font-bold text-ink-soft whitespace-nowrap`; body row `border-b border-line last:border-b-0 hover:bg-canvas/70`, td `px-3 py-2.5 align-middle`.

KPI tile: `rounded-panel border border-line bg-white p-4`; label `text-sm text-ink-muted`; value `mt-1 text-[26px] leading-none font-bold text-ink tabular-nums`; optional unit `text-sm font-medium text-ink-muted`; optional `Chip`. Highlight a critical KPI with `border-brand/40 bg-blush/40` not a dark fill.

Alert banner: `flex items-start gap-3 rounded-input border px-4 py-3 text-sm` with tone `border-warn-ink/25 bg-warn-fill text-ink` (warning), `border-brand/30 bg-blush text-ink` (critical), `border-ok-ink/25 bg-ok-fill text-ink` (success); icon colored with the tone ink.

Toast: `fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)]` with a `CheckCircle2` icon in `text-ok-ink` (or `TriangleAlert` in `text-danger-ink`). On donor pages put it above the mobile bottom nav (`bottom-20 md:bottom-4`).

Modal: overlay `fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center`; dialog `w-full max-w-[560px] rounded-panel bg-white shadow-[var(--shadow-float)]`; header `flex items-center justify-between border-b border-line px-5 py-4` white background with title `text-lg font-bold text-ink` and close icon button `h-10 w-10 rounded-input text-ink-soft hover:bg-canvas` with aria-label; footer `flex justify-end gap-2 border-t border-line px-5 py-4`. Keep role="dialog" aria-modal and labels.

Page header (console pages; the console layout already renders `<main id="konten-utama">`, so console pages must NOT render another `<main>`; use `<div>`):
```
<div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="text-[26px] leading-tight font-bold text-ink">Judul halaman</h1>
    <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">Satu kalimat yang menjelaskan apa yang dilakukan di halaman ini.</p>
  </div>
  <div className="flex flex-wrap gap-2">{/* aksi */}</div>
</div>
```
then `mt-6 space-y-6` for the body.

Public and donor pages: their `<main>` must have `id="konten-utama"`. Donor pages need `pb-24 md:pb-10` so the mobile bottom nav does not cover content.

Typography: h1 public 32/40px, console 26px; h2 22px (`text-[22px] font-bold`); body 15 to 16px; captions `text-sm text-ink-muted`. Line length max ~70ch.

Spacing: public/donor generous (p-5 to p-6, gaps 16 to 24), console dense (p-4, gaps 12 to 16, table rows ~44px).

Responsive: must work at 375px with no horizontal page scroll (tables scroll inside their wrapper). Touch targets 44px on public/donor.

Accessibility: every input has a visible label; icon-only buttons have aria-label; decorative icons `aria-hidden="true"`; keep existing aria attributes.

## When done
Run `npx tsc --noEmit` in `web` (ignore errors in files you do not own, but report them). Then grep your files for `—`, `uppercase`, `font-mono`, ` • `, `ArrowRight`, `blue-`, `slate-`, `rose-`, `text-[10px]`, `text-[11px]`, `bg-ink ` and fix leftovers. Reply with a short list of files changed and anything you could not resolve.

