# Saudi HRMS — Luxury Design System

## Inspiration
Inspired by the **ZenHR** concept: a premium, luxury HRMS interface using White, Gold (#d4af37) and Deep Forest Green (#1b4d3e). The aesthetic targets C-suite and HR leaders in the Saudi market who expect sophistication, clarity, and elegance.

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `forest-DEFAULT` | `#1b4d3e` | Primary background for top nav; accent text, buttons |
| `forest-light` | `#f0f5f2` | Subtle sage backgrounds, progress bars |
| `gold-DEFAULT` | `#d4af37` | Border accents on cards, circular KPI rings, decorative highlights |
| `gold-light` | `#e8d5b7` | Progress bar gradient start |
| `gold-dark` | `#c49b2d` | Language toggle hover state |
| White | `#ffffff` | Card backgrounds, content area |
| Slate-50 | `#f8fafb` | Dashboard content background gradient |
| Slate-800 | `#1a1f26` | Headings and primary text on white |

## Typography

- **Primary**: `Satoshi` (via Fontshare) — used throughout all Saudi pages
- **Fallback**: `Inter, system-ui, sans-serif`
- **Scale**: 4xl (headings), 3xl (KPI values), xl (card titles), base (body), xs (labels)

## Component Architecture

### Top Navigation
- Full-width, `h-24`, forest green background
- Logo on left (`10x10` white rounded box with gold grid icon + "ZenHR" text)
- Nav links in center with active state: `bg-white/10 border border-gold/50 rounded-full`
- Right side: gold language toggle button (`bg-gold`), profile avatar (`w-10 h-10 rounded-full border-2 border-white/40`)
- Glassmorphism variant: `bg-white/20 backdrop-blur`

### Dashboard Container
- `dashboard-container` class: gradient `#f8fafb` → `#ffffff`, `rounded-[40px_0_0_0]`, full height
- Applied to the `<main>` element below the top nav

### KPI Cards
- White background, `rounded-[32px]`, subtle shadow, gold border (`border-gold/20`)
- Layout: flex row with circular icon container (`w-14 h-14 rounded-full`) on left, value + label on right
- Icon containers have pale tinted backgrounds (e.g. `bg-[#fdf8f3]`, `bg-[#f0f5f2]`, `bg-[#fff8e7]`)

### Chart Area (Invoice Payments)
- White `rounded-[32px]` card with gold border
- Header: title + legend (colored vertical bars + counts)
- Body: 6-column grid of stacked `chart-grid-tile` divs (48px height, rounded, with opacity layering)

### Task Status
- White `rounded-[32px]` card with gold border
- Rows: numbered circle + label + full-width progress bar
- Progress bars: `progress-bar-gold` (gold gradient) and `progress-bar-sage` (sage to forest gradient)

### Projects Table
- White `rounded-[32px]` card with gold border
- Column headers with icons: Projects, Priority, Due Date
- Row: `bg-slate-50/50 rounded-2xl`, bold project name, pill badge for priority, date

### Completion Ring
- White `rounded-[32px]` card with gold border
- Large decorative circle in bottom-right: `w-80 h-80 bg-[#fff8e7] rounded-full opacity-70 border-gold/10`
- Center: percentage text (5xl, forest green) + "Overall Completion" label

## Page Template Pattern

Every Saudi page follows this structure:
```
Forest green top nav (full width)
└── White content area (rounded top corners)
    └── Card grid using white/gold/rounded-[32px] pattern
```

Card style for all pages:
```tsx
<div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
```

Progress bars:
```tsx
<div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
  <div className="h-full w-3/4 progress-bar-gold" />
</div>
```

## RTL Support

The design supports Arabic via `dir="rtl"` on `<html>`. The `rtl-flip` class mirrors icons horizontally. A language toggle button switches between `العربية` and `EN`.

## Key CSS Classes (global stylesheet)

```css
.dashboard-container {
  background: linear-gradient(135deg, #f8fafb 0%, #ffffff 100%);
  border-radius: 40px 0 0 0;
}
.kpi-circle {
  width: 56px; height: 56px;
  border-radius: 28px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(212, 175, 55, 0.2);
}
.chart-grid-tile {
  height: 48px; border-radius: 8px; opacity: 0.8;
}
.progress-bar-gold {
  background: linear-gradient(90deg, #e8d5b7 0%, #d4af37 100%);
}
.progress-bar-sage {
  background: linear-gradient(90deg, #f0f5f2 0%, #1b4d3e 100%);
}
.glass-nav {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border-radius: 100px;
}
```
