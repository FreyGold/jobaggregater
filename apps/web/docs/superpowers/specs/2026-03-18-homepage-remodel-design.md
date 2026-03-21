# Design Spec: Home Page Remodel - "Command Center"

**Date:** 2026-03-18  
**Status:** Draft  
**Topic:** Home Page Redesign & System Normalization  

---

## 1. Objective
Remodel the current home page into a high-end, professional "Command Center" that balances immediate action (search) with a sophisticated narrative. This change will also serve as a benchmark for normalizing the design system across the entire application.

## 2. Visual Direction: "Command Center" (High-End Professional)
*   **Vibe:** Minimalist, sophisticated, high-performance (Linear/Vercel inspired).
*   **Layout:** Action-first hero with a centered, high-fidelity search bar.
*   **Typography:** Tight-tracked headings (`tracking-tighter`) using `var(--font-sans)`.
*   **Color Palette:** Strictly uses existing `oklch` variables from `globals.css`.
    *   **Primary:** `oklch(0.57 0.2 283.26)` (Violet) for accents and primary actions.
    *   **Backgrounds:** `oklch(0.98 0 0)` (Light) / `oklch(0.23 0.01 268.25)` (Dark).
    *   **Borders:** Subtle `oklch(0.87 0 0)` / `oklch(0.39 0 0)`.

## 3. Architecture & Components

### A. Hero Section (`src/app/page.tsx`)
*   **Container:** `max-w-7xl` with significant vertical padding (`py-32`).
*   **Heading:** Large, bold typography with a subtle `primary-to-primary/60` gradient.
*   **Subheading:** `text-muted-foreground` with generous line-height for readability.
*   **The Command Bar:** 
    *   A centered, oversized `SearchBar` wrapper.
    *   `radius-2xl` or `3xl` with a deep `shadow-xl`.
    *   Subtle "glow" effect on focus using `ring-primary/20`.

### B. Normalized UI Components
To ensure consistency, we will refine the following components:
1.  **`JobAggCard` (Standard Card):**
    *   Replaces generic `Card` usage on the home page.
    *   Defined padding, `radius-xl`, and subtle hover scale transition.
2.  **`StatsGrid`:**
    *   A clean, 4-column layout below the hero.
    *   Icons use `lucide-react` with a consistent `primary/10` background container.
3.  **`LogoCloud`:**
    *   Grayscale logos of job sources (LinkedIn, Indeed, etc.) with a color-on-hover transition.

### C. System Normalization
*   **Global CSS:** Update `globals.css` if necessary to ensure `tracking-tighter` and `radius-2xl/3xl` are consistently available.
*   **Animations:** Use `tw-animate-css` for subtle entry transitions (fade-in, slide-up).

## 4. Implementation Details

### Data Flow
*   The `SearchBar` on the home page will continue to use the existing search logic but with an updated UI shell.
*   Stats will be statically defined for the prototype but structured for future API integration.

### Testing Strategy
*   **Visual Regression:** Compare the new "Command Center" against the old home page.
*   **Responsive Check:** Ensure the "Action-First" layout scales gracefully to mobile (search bar should remain dominant).
*   **Dark Mode:** Verify all `oklch` transitions are smooth and maintain high contrast.

## 5. Success Criteria
*   The home page feels significantly more "premium" and professional.
*   The search bar is the clear, immediate focal point.
*   The design language is consistent with the established `oklch` color system.
*   Navigation to the search results (`/jobs`) is seamless.
