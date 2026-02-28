# CLAUDE.md

## Commands

```bash
pnpm dev                    # all apps
pnpm dev:server             # server only (Cloudflare Workers)
pnpm dev:native             # native only (Expo)

pnpm test                   # all tests
pnpm test:server            # server tests (vitest)
pnpm test:native            # native tests (jest)
# Single test file:
pnpm --filter server test -- workout-schema
pnpm --filter native test -- MyComponent

pnpm test:coverage            # server coverage report + thresholds

pnpm check                  # oxlint + oxfmt --write
pnpm check:ci               # oxlint + oxfmt --check (no write)
pnpm check-types            # tsc across all packages

pnpm db:generate            # drizzle-kit generate
pnpm db:push                # drizzle-kit push
```

## Architecture

pnpm workspace monorepo: `apps/*`, `packages/*`.

**Apps:**

- `apps/server` — Hono on Cloudflare Workers. tRPC at `/trpc/*`, auth at `/api/auth/*`.
- `apps/native` — Expo Router + HeroUI Native + TanStack Query.

**Packages** (`@ironlog/*`):

- `api` — tRPC router & context
- `auth` — Better Auth config
- `db` — Drizzle ORM + libSQL (Turso). Schema at `packages/db/src/schema/`.
- `env` — type-safe env (`@t3-oss/env-core` for native, Cloudflare bindings for server)
- `config` — shared tsconfig
- `infra` — Alchemy (Cloudflare infra-as-code)

**Data flow:** Native → tRPC client → Hono server → tRPC router → Drizzle → libSQL/Turso

## Testing

- **Server:** Vitest with `@cloudflare/vitest-pool-workers` (tests run in Miniflare). Config: `apps/server/vitest.config.ts`.
- **Native:** Jest with `jest-expo` preset. Config: `apps/native/jest.config.js`.
- Test files live next to source (colocated) in `__tests__/` directories.

### Test types

- **Unit tests** — pure logic: Zod validators, utils, transforms. No DB or network.
- **Integration tests** — DB-backed: tRPC endpoints, Drizzle queries. Run in Miniflare.
- Both types required for server features. Unit test validators/pure functions; integration test DB operations and tRPC endpoints.

### TDD flow

Write failing test first → implement → refactor. Use `/tdd` skill.

**IMPORTANT — Server implementation plans must be phased TDD:**

1. Split every plan into phases. Each phase = exactly one test case.
2. Write one failing test → make it green → only then move to next phase.
3. Never write multiple tests at once or implement ahead of a failing test.
4. Final phase is always a refactor pass over all implementation, verified by all tests staying green.

### Coverage

- `pnpm test:coverage` — generates report, enforces thresholds.
- Thresholds: lines 70%, functions 60%, branches 60%, statements 70%.
- Coverage must pass before merging.

## Native UI Design System

All native UI must use the app's custom design system. **Never use HeroUI Native components for visual styling** — use plain React Native components (`View`, `Text`, `Pressable`, `TextInput`, `ActivityIndicator`, `ScrollView`) styled with the constants from `apps/native/theme.ts`.

### Colors (`@/theme`)

- **Backgrounds:** `Colors.bg` (base), `Colors.surface1`–`surface4` (layered surfaces)
- **Text:** `text1` (primary), `text2` (secondary), `text3` (tertiary), `text4` (placeholder/disabled)
- **Accent:** `Colors.accent` (#e8ff47 yellow-green) — primary buttons, active tab indicators
- **Semantic:** `Colors.orange` (actions), `Colors.green` (success), `Colors.red` (destructive/errors)
- **Borders:** `Colors.border`, `Colors.border2`

### Constants

- `RADIUS_CARD: 12` — cards, buttons
- `RADIUS_INPUT: 9` — input fields
- `TAP_MIN: 44` — minimum touch target height

### Typography

- `BebasNeue_400Regular` — large display headings only
- `DMSans_600SemiBold` — section headers, button text, page titles
- `DMSans_500Medium` — labels
- `DMSans_400Regular` — body text, input values

### Patterns

- **Cards:** `backgroundColor: Colors.surface1`, `borderRadius: RADIUS_CARD`, `padding: 14–16`
- **Inputs:** `backgroundColor: Colors.surface2`, `borderRadius: RADIUS_INPUT`, `borderWidth: 1`, `borderColor: Colors.border`, `padding: 14`, `color: Colors.text1`, `placeholderTextColor: Colors.text4`
- **Primary buttons:** `backgroundColor: Colors.accent`, `borderRadius: RADIUS_CARD`, `minHeight: TAP_MIN`, text `color: Colors.bg`
- **Pressed/disabled state:** `opacity: 0.7`
- **Screen layout:** `useSafeAreaInsets()` for padding, `Colors.bg` background
- **Spacing:** `gap` property on parent View (6–16px), no margin hacks

## Workflow

- Always use `pnpm` (never npm/yarn/bun for package management).
- Always create a branch before starting work.
- Always use `/tdd` skill for feature and bug work.
- Linting is oxlint + oxfmt (not eslint/prettier).
