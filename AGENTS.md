# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes and layouts (e.g., `src/app/app/inbox/page.tsx`).
- `src/components/`: Feature components and shared UI. Reusable shadcn/ui primitives live in `src/components/ui/`.
- `src/lib/`: Types, mocks, formatting helpers, and navigation config.
- `public/`: Static assets (icons, placeholder avatars, etc.).
- `docs/`: Product scope and planning notes.
- `temp-crm/`: Legacy/duplicate scratch area; do not edit unless explicitly requested.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run build`: Create a production build with Next.js.
- `npm run start`: Run the production build locally.
- `npm run lint`: Run ESLint with `eslint-config-next`.

## Coding Style & Naming Conventions
- Language: TypeScript + React (Next.js 16 App Router) with Tailwind CSS.
- Indentation: 2 spaces; prefer explicit types for public APIs.
- File naming: kebab-case in `src/components` and `src/app` (PT-BR names are used for routes/components).
- UI: Use shadcn/ui patterns and Radix primitives; place new primitives in `src/components/ui`.

## Testing Guidelines
- No automated tests are configured yet. If you introduce tests, document how to run them and keep them scoped to the feature.

## Commit & Pull Request Guidelines
- Recent commit style uses short PT-BR prefixes and a colon, e.g. `ajustes: sidebar e textos pt-br` or `etapa-1: appshell e painel`.
- PRs should include a clear description, screenshots for UI changes, and any new commands added.

## Configuration Tips
- Static content (labels, mock data) is centralized in `src/lib/`.
- Keep layout changes aligned with the existing Tailwind + shadcn/ui composition patterns.
