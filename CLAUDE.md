# JobAgg AI Assistant Guidelines

This file provides context for AI assistants (Claude, Copilot, etc.) working on the JobAgg codebase.

---

## Design Context

### Users
JobAgg serves job seekers across all industries, career levels, and locations who are frustrated by the fragmentation of online job search. The primary user is someone actively job hunting who:
- Needs to search across multiple platforms but doesn't want to visit 30+ sites
- Values efficiency and comprehensive coverage over any single board's unique features  
- Wants a clean, distraction-free interface that gets out of their way
- May be conducting their search while employed (discretion, speed, and focus are important)

**Context of Use**: Quick searches during work breaks, evening browsing sessions, or focused job hunt sprints. Users are goal-oriented and need to quickly filter, save, and move on.

**Job to Be Done**: "Help me find all relevant opportunities across the entire job market without wasting time on redundant searches or missing hidden listings."

**Emotional Goal**: The interface should evoke **confidence, clarity, and calm efficiency**. Users should feel like they're using a powerful, professional tool that respects their time and intelligence — not a cluttered job board trying to distract them with ads or upsells.

### Brand Personality
**Three words**: Professional, Efficient, Trustworthy

**Voice & Tone**:
- **Direct and action-oriented** — clear CTAs, no marketing fluff
- **Intelligent without being cold** — helpful, not robotic
- **Confident but humble** — we do one thing exceptionally well (aggregation), and we don't oversell

**References** (what feels right):
- **Linear**: Minimalist command-center aesthetic, tight typography, deliberate use of color
- **Vercel**: Clean, fast, high-performance feel with subtle sophistication
- **Arc Browser**: Modern gradients, thoughtful micro-interactions, premium feel without being stuffy

**Anti-References** (explicitly NOT this):
- ❌ Indeed/Monster — cluttered, ad-heavy, dated UI patterns
- ❌ Generic SaaS dashboards — overly sterile, corporate, soulless
- ❌ Trendy consumer apps — too playful, too many animations, visually loud

### Aesthetic Direction
**Visual Tone**: **Minimalist Command Center** — sophisticated, focused, high-performance

**Key Visual Principles**:
1. **Action-First Layouts**: The most important action (search) should be immediately obvious and dominant
2. **Generous Whitespace**: Breathing room reinforces clarity and focus
3. **Subtle Depth**: Use shadows and layers sparingly for hierarchy, not decoration
4. **Precision Typography**: Tight tracking (`tracking-tighter`), clear hierarchy, Geist font family
5. **Restrained Color**: Violet primary for accents and primary actions; most UI is neutral with high contrast
6. **Sharp Geometry**: 0rem base radius (sharp corners) for a precise, technical feel — only use rounded corners deliberately (e.g., `rounded-3xl` for hero search to emphasize it)

**Color Strategy**:
- **OKLCH color space** throughout for perceptual uniformity
- **Primary (Violet)**: `oklch(0.57 0.2 283.26)` in light mode, `oklch(0.92 0.05 67.14)` in dark mode
  - Use for: primary CTAs, links, focus states, key icons, accents
  - Gradient: `from-primary to-primary/60` for hero headlines
- **Backgrounds**: Near-white (`oklch(0.98 0 0)`) in light, near-black (`oklch(0.18 0 0)`) in dark
- **Muted elements**: Use `muted-foreground` for secondary info, icons, metadata
- **Borders**: Extremely subtle (`oklch(0.88 0 0)` light, `oklch(0.24 0.01 88.77)` dark)

**Theming**:
- **Light and Dark modes** are first-class citizens (via `next-themes`)
- Dark mode is not an afterthought — it's sophisticated (`oklch(0.21 0.01 285.56)` sidebar background)
- All colors transition smoothly between modes
- Support user preference with system default

**Spacing & Layout**:
- Use Tailwind's default spacing scale
- Generous padding on hero sections (`py-24`, `py-32`)
- Card padding is consistent: `p-5` or `p-6`
- Containers max width: `max-w-7xl` for content, `max-w-2xl` or `max-w-4xl` for focused sections

**Typography**:
- **Font Family**: Geist (sans), Geist Mono (mono) — already loaded via CSS variables
- **Headings**: `font-extrabold` or `font-bold`, `tracking-tight` or `tracking-tighter`, large sizes (`text-5xl`, `text-6xl`, `text-7xl` for hero)
- **Body**: `text-base`, `text-lg`, generous `leading-relaxed` for readability
- **Metadata/Labels**: `text-sm`, `text-muted-foreground`, `font-medium`

**Components**:
- **shadcn/ui** (base-nova style) with Radix primitives
- **Lucide React** for icons (consistent stroke width, clean)
- Cards have subtle hover states: `hover:border-primary/20 hover:shadow-md`
- Buttons use `radius-lg` (0rem base, so sharp) unless deliberately rounded
- Focus states use `ring-2 ring-ring/50 ring-offset-2` for accessibility

**Animations**:
- **Purposeful, not decorative** — only animate to guide attention or provide feedback
- Use `tw-animate-css` for subtle entry transitions (`animate-fade-in`, slide-ups)
- Hover transitions are fast (`transition-colors`, `transition-all`) and understated
- NO gratuitous motion — respect `prefers-reduced-motion`

**Accessibility**:
- WCAG AA minimum (high contrast in both light/dark modes)
- All interactive elements have visible focus states
- Icons always paired with text or aria-labels
- Form inputs use proper labels (Radix UI handles most of this)
- Respect `prefers-reduced-motion` (animations should be optional or subtle)

### Design Principles

**1. Clarity Over Cleverness**  
Every element should have a clear purpose. If it doesn't help the user find, filter, or save jobs, question whether it belongs. Avoid visual tricks, complex layouts, or hidden interactions.

**2. Speed Is a Feature**  
The UI should feel instant. Minimize loading states, optimize images, use skeleton loaders sparingly. Fast transitions, no unnecessary animations. Performance is part of the design language.

**3. Consistency Builds Trust**  
Use the OKLCH design token system religiously. Components should feel like part of a unified system, not one-off designs. Spacing, typography, and color usage should be predictable across every page.

**4. Progressive Disclosure**  
Show the essentials first (search bar, key filters). Advanced options, settings, and secondary actions should be available but not dominant. Don't overwhelm users with all features at once.

**5. Dark Mode as Default for Sophistication**  
While we support light mode, the dark theme (`oklch(0.18 0 0)` background, violet accents) is the "hero" aesthetic — it communicates focus, professionalism, and modernity. Optimize for dark first when making design decisions.

---

## Component Patterns

### Standard Job Card
```tsx
<Card className="group hover:border-primary/20 hover:shadow-md">
  <CardContent className="p-5">
    {/* Job metadata with lucide icons, text-sm, text-muted-foreground */}
  </CardContent>
</Card>
```
- **Hover state**: subtle border color shift + shadow lift
- **Icons**: 3.5x3.5 Lucide icons in `text-muted-foreground`
- **Remote indicator**: uses `text-primary` with Wifi icon

### Hero Search Bar
```tsx
<div className="rounded-3xl border bg-card p-4 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl">
  <SearchBar size="lg" />
</div>
```
- **Deliberately rounded** (`rounded-3xl`) to emphasize importance
- Deep shadow (`shadow-xl`) + shadow lift on hover
- Backdrop blur for subtle depth

### Stats / Feature Grid
- **Icons**: Lucide icons in primary color, contained in `bg-primary/10` rounded containers
- **Hover**: `hover:bg-primary/10 hover:ring-primary/20` (subtle interactive feedback)
- **Typography**: Large bold values (`text-3xl font-bold`), smaller labels (`text-sm text-muted-foreground`)

---

## Technical Context

### Tech Stack
- **Framework**: Next.js 15 (App Router, React Server Components)
- **React**: 19.0.0
- **Styling**: Tailwind CSS 4.0, OKLCH color space
- **UI Components**: shadcn/ui (base-nova style) with Radix UI primitives
- **Icons**: Lucide React
- **State**: TanStack Query (React Query) for server state
- **Theme**: next-themes for dark/light mode
- **Monorepo**: pnpm workspaces (`@jobagg/web`, `@jobagg/api`, `@jobagg/shared`, `@jobagg/mobile`)

### File Structure
```
apps/web/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   │   ├── ui/       # shadcn primitives
│   │   ├── jobs/     # Job-specific components
│   │   └── layout/   # Header, Footer, Container
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utilities, helpers
│   └── providers/    # Context providers
├── public/           # Static assets
└── components.json   # shadcn config
```

### Code Conventions
- **TypeScript**: Strict mode, prefer type inference
- **Components**: Functional components with hooks, TSX files
- **Styling**: Tailwind utility classes, use `cn()` from `lib/utils` for conditional classes
- **Imports**: Use path aliases (`@/components`, `@/lib`, `@/hooks`)
- **Server/Client**: Use `'use client'` directive only when necessary (interactivity, hooks)
- **Comments**: Use `// ─── Section Name ───...` for visual section dividers

### Design Token Usage
All colors are defined in `apps/web/src/app/globals.css` as CSS variables:
- Use `bg-background`, `text-foreground`, `border-border`, etc.
- DO NOT hardcode colors — always use semantic tokens
- Primary color is `bg-primary`, `text-primary`, etc.
- For opacity variations: `bg-primary/10`, `border-primary/20`

---

## When Making Changes

### Adding New UI Components
1. Check if shadcn/ui has it first: `pnpm dlx shadcn@latest add <component>`
2. Place in `components/ui/` if it's a primitive, or feature folder if specific
3. Use existing design tokens (no new colors)
4. Test in both light/dark modes
5. Ensure proper focus states for accessibility

### Modifying Existing Components
1. Maintain existing patterns (hover states, spacing, typography)
2. Don't break the visual language (sharp corners default, rounded only when deliberate)
3. Verify no regressions in dark mode
4. Keep OKLCH color system intact

### Writing Copy
- **Concise and action-oriented**: "Find jobs faster" not "Discover opportunities"
- **Helpful, not corporate**: "We aggregate 30+ job boards" not "Leverage our comprehensive platform"
- **No jargon**: Speak plainly

### Performance Considerations
- Optimize images (use Next.js Image component)
- Lazy load below-the-fold content
- Minimize client-side JavaScript (prefer RSC when possible)
- Keep bundle sizes small (tree-shake, code split)

---

## Quick Reference

**Primary Color (Violet)**:
- Light: `oklch(0.57 0.2 283.26)` / `oklch(0.43 0.04 42)` (from globals.css)
- Dark: `oklch(0.92 0.05 67.14)`
- Hex (approx): `#7C3AED` → `#4F46E5` (gradient)

**Fonts**:
- Sans: Geist (via `--font-sans`)
- Mono: Geist Mono (via `--font-mono`)

**Border Radius**:
- Base: `0rem` (sharp corners)
- Deliberate rounding: `rounded-3xl` for hero elements, `rounded-xl` for feature cards

**Spacing for Sections**:
- Hero: `py-24 sm:py-32`
- Features: `py-24 sm:py-32`
- Cards: `p-5` or `p-6`

**Icons**:
- Size: `h-3.5 w-3.5` for inline, `h-5 w-5` for logo, `h-6 w-6` or `h-7 w-7` for feature icons
- Always from `lucide-react`
