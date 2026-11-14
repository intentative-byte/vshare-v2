# VSHARES — Design System and Navigation Blueprint

- Version: 1.0 (specification; nothing built yet) · Date: 2026-11-14
- Direction confirmed by the owner: black and gold primary; white and silver supporting typography; blue permitted as a secondary accent; premium dark interface; mobile-first; modern and distinctive. Not light/violet, not a corporate dashboard, not a course catalogue.
- Brand lines: "Stop doomscrolling. Start value scrolling." · "Not designed to keep you scrolling. Designed to move you forward." · "An Operating System for Becoming."
- Historical asset audit: the repository contains no logo, icon, font or image assets on any branch. The only prior black/gold implementation is PR #1's `app/globals.css` (background `#050505`, foreground `#f8f2de`, gold `#f5c451` / `#d7a72d`, Arial); its palette direction is kept and refined below. The Lovable beta could not be inspected from this environment. Exact values are confirmed on built reference screens in Milestone 1.

## 1. Design principles

1. **One thing per screen.** Each screen has a single primary action, in gold. Everything else is quiet.
2. **Gold is earned.** Gold marks the primary action, progress and achievement. It is never decoration, so it keeps its meaning.
3. **Calm, not casino.** No confetti storms, countdown timers, red badges or pulsing prompts. Progress feedback is brief and precise.
4. **Content first.** Lessons are typeset for reading: generous line height, restrained measure, real hierarchy.
5. **Honest numbers.** Every score has a visible "how this is calculated". Self-reported data is labelled.
6. **Reveal with progress.** New users see one path, one mission, one next action. Depth appears as it becomes relevant.

## 2. Colour tokens

Dark theme only in the MVP. Contrast ratios below were computed with the WCAG 2.x formula for this document.

| Token | Hex | Use | Contrast on `bg` | on `surface` | on `raised` |
|---|---|---|---|---|---|
| `bg` | `#0A0A0B` | App background | — | — | — |
| `surface` | `#141416` | Cards, sheets | — | — | — |
| `raised` | `#1C1C20` | Popovers, pressed/hover surface | — | — | — |
| `border` | `#2A2A30` | Decorative dividers only | 1.4 | 1.3 | 1.2 |
| `border-strong` | `#6B6860` | Input and control outlines | 3.6 | 3.3 | 3.1 |
| `white` | `#FFFFFF` | Headings and emphasis | 19.8 | 18.4 | 17.0 |
| `text` | `#F5F2E8` | Body text (warm off-white) | 17.7 | 16.4 | 15.2 |
| `silver` | `#C7CBD1` | Supporting text, metadata, icons | 12.1 | 11.3 | 10.4 |
| `silver-dim` | `#8E939B` | Tertiary text, placeholders | 6.4 | 6.0 | 5.5 |
| `gold` | `#E8B84A` | Primary accent, primary button fill, progress | 10.7 | 10.0 | 9.2 |
| `gold-bright` | `#F5CC6A` | Hover / focus highlight | 12.9 | 12.0 | 11.1 |
| `gold-deep` | `#B8892B` | Gradient end, pressed state | 6.3 | 5.8 | 5.4 |
| `success` | `#4ADE80` | Correct, completed | 11.4 | 10.6 | 9.7 |
| `danger` | `#F87171` | Errors, destructive | 7.2 | 6.7 | 6.1 |
| `blue` | `#5B9DFF` | Secondary accent: links, informational states, VAI "Why this?" | 7.3 | 6.8 | 6.2 |

Rules that follow from the numbers:
- Text on a gold fill uses `bg` (`#0A0A0B`): 10.7:1 on `gold`, 12.9:1 on `gold-bright`.
- Every text token meets 4.5:1 on all three surfaces.
- `border-strong` meets the 3:1 minimum for control boundaries on all three surfaces. `border` (1.2–1.4:1) is decorative only and never the sole indicator of a control.
- Gold is for action and progress; blue is for information and explanation. They are never used for the same purpose on one screen.
- Meaning is never carried by colour alone: correct/incorrect also use icon and text.

Gradients (the only two allowed):
- `gradient-gold`: `gold-bright → gold → gold-deep` at 135°, for the primary button, progress fill and the logo mark.
- `gradient-aura`: a single low-opacity radial gold glow behind a hero or milestone moment. One per screen at most.

## 3. Typography

Proposed pairing, both open-licence and self-hosted (no third-party font requests at runtime):

| Role | Family | Why |
|---|---|---|
| Display / headings | Sora | Geometric, confident, distinctive at large sizes without being loud |
| Body / UI | Inter | Highly legible at small sizes on mobile; wide language coverage |
| Numerals in stats | Inter with tabular figures | Stable, aligned numbers |

Scale (rem, 16px base): 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 2 · 2.5 · 3.25. Body 1rem / 1.6 line height; lesson body 1.125rem / 1.7, max measure 68 characters. Headings 1.15–1.25 line height, slight negative tracking at 2rem and above. Text scales with user font-size settings; no fixed-pixel text.

## 4. Space, shape, elevation, motion

- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px.
- Radius: 8 (controls) · 16 (cards) · 24 (sheets) · full (pills, avatars).
- Elevation is expressed by surface tone and a 1px border, not heavy shadows; one soft shadow for floating layers.
- Minimum touch target 44 × 44 px; primary actions sit in thumb reach on mobile.
- Motion: 120 ms (micro), 200 ms (standard), 320 ms (page/sheet); ease-out entering, ease-in leaving. `prefers-reduced-motion` removes non-essential motion entirely.
- Breakpoints: 640 · 768 · 1024 · 1280 px. Designed at 360px wide first.

## 5. Components

Primitives (in `src/components/ui`), each with documented variants, states (default, hover, focus-visible, active, disabled, loading) and an accessibility note:

| Group | Components |
|---|---|
| Actions | Button (primary gold, secondary outline, ghost, destructive), IconButton, Link |
| Inputs | TextField, TextArea, Select, Checkbox, RadioGroup, Switch, ChoiceChip (topic picker), SearchField — all with visible label, help text, error text tied by `aria-describedby` |
| Layout | AppShell, TabBar (mobile), SideRail (desktop), PageHeader, Card, Section, Sheet, Dialog |
| Feedback | Toast (polite live region), InlineAlert, Skeleton, EmptyState, ErrorState, ProgressBar, ProgressRing |
| Learning (MVP) | ValueCard (feed and full variants), Takeaways, SourceAttribution, CardActions (Got it · Save · Like · Skip), WinState, ClosingCard, WhyThis (recommendation reasons), NextBestCard, TopicChip, ProgressSummary, StatTile (with "how this is counted"), AiAssistedLabel, HighImpactNotice |
| Learning (later) | LessonReader, QuizQuestion, QuizResult, QuestCard, PathProgress, MasteryBadge, AppliedEntry |
| Admin | DataTable, FilterBar, FunnelChart, StatusPill, FormSection |

Every data-driven view defines four states before it is considered done: loading (skeleton matching final layout), empty (what this is + one action), error (what happened + retry), and populated.

Documentation: a `/dev/ui` route, available only outside production, renders every component in every state. It doubles as the target for visual and accessibility checks.

## 6. Navigation blueprint

### Structure

```text
/                      Home (public): promise + topic chips → first value card
/c/[slug]              Public value-card page (shareable, attributed)
/sign-in  /auth/callback
/path                  PATH: Next Best · this week's progress · your topics
/learn                 LEARN: finite feed session → closing card
/explore               EXPLORE   /explore/[category]  /explore/topic/[slug]  /explore/search
/saved                 SAVED (Saved · Completed)
/you                   YOU (Progress · Preference memory · Submissions · Profile)
/you/submit            Submit a resource
/you/settings          Privacy · personalisation · sign-out everywhere
/you/data              Export · delete account
/admin                 Role-guarded: queue · reports · catalogue · taxonomy · users & roles · analytics · flags · audit
/legal/privacy  /legal/terms
```

### Mobile (primary)

- Bottom tab bar, five items in the order PATH · LEARN · EXPLORE · SAVED · YOU, icon + label always visible, active tab in gold with a text label (not colour alone), `aria-current="page"`.
- The full value-card screen is focused: tab bar hidden, a single back control, actions in thumb reach.
- Top bar carries only the screen title and at most one contextual action.

### Desktop

- Left side rail with the same five destinations, wordmark at the top, account menu at the bottom. Content column max 720px for reading screens, wider grid for Explore and admin.

### Guests

- Guests use LEARN, EXPLORE, SAVED and PATH fully on their guest account. YOU shows their progress and a single clear offer to keep it by creating an account ("2 completed — create an account to keep them"). Submitting and reporting require an account. No dead ends, no modal walls.

### Progressive disclosure schedule

| Stage | Trigger | What appears |
|---|---|---|
| 0 Visitor | First load | Promise, topic chips |
| 1 First card | Topic chosen | One value card: takeaways, source, "Got it" |
| 2 First win | First card completed | Win state, one follow-up, offer to keep progress |
| 3 Exploring | Second card or tab use | LEARN session, save / like / skip, "Why this?" |
| 4 Registered | Account created | PATH with Next Best and progress; SAVED; more topics |
| 5 Contributing | ≥ 5 completions | Submit a resource; preference memory detail |
| Later releases | — | Paths, quizzes, quests, applied log, achievements, daily cycle |

## 7. Voice

- Direct, warm, adult. Short sentences. Says what happens next.
- Encourages by naming what was done ("You can now explain what a token is"), not by inflating ("Amazing! You're on fire!").
- Never guilt, never urgency, never loss framing. After a break: "Welcome back. Here's a good place to pick up."
- States limits plainly: "This is your own record of what you did. It isn't verified."
- VAI speaks in the first person only when explaining a recommendation, and always gives the reason.

## 8. Accessibility baseline (WCAG 2.2 AA)

- Full keyboard operation with a visible 2px gold focus ring offset from the element; logical focus order; skip-to-content link.
- Semantic landmarks and headings; one `h1` per page.
- Forms: programmatic labels, error summary plus inline errors, no placeholder-as-label.
- Live regions for async results (quiz grading, saves).
- Media (later): captions, transcripts, keyboard-operable player.
- Automated axe checks in the E2E suite on every core screen; manual screen-reader pass before release, recorded in the test report.

## 9. Open items

- Logo and wordmark: none available. A simple typographic wordmark will be used until the owner supplies or commissions one.
- Font pairing and exact gold, silver and blue values: to be confirmed by the owner on the Milestone 1 reference screens.
- Light theme: not planned.
