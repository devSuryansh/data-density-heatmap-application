# Contributing Guide

## Project Philosophy

Data Density Heatmap Application supports open-science data quality workflows for D4CG / Chicago PCDC. Contributions should improve clarity, reproducibility, and maintainability for research data teams.

## Development Setup (Bun)

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   bun install --frozen-lockfile
   ```
3. Create `.env.local` from `.env.example`.
4. Run local development server:
   ```bash
   bun run dev
   ```
5. Validate before pushing:
   ```bash
   bun run type-check
   bun run lint
   bun run test --coverage
   bun run build
   ```

## Branch Naming Convention

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`
- `test/<short-description>`

## Commit Convention

Use Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `chore:` tooling/maintenance
- `test:` test updates
- `refactor:` non-functional code improvement

## Pull Request Process

1. Fork repository.
2. Create a branch from `main`.
3. Implement and test your changes.
4. Open a PR against `main` with a clear summary.
5. Address review feedback and keep CI green.

## Code Style

- TypeScript strict mode only (`no any`)
- ESLint + Prettier are enforced in CI
- Prefer named exports in shared modules
- Keep GraphQL and density logic fully typed

## Running Quality Checks

```bash
bun run type-check
bun run lint
bun run test --coverage
bun run build
```

## Issue Labeling Guide

- `bug`: unexpected behavior or regression
- `enhancement`: feature or UX improvement
- `documentation`: docs-only updates
- `good first issue`: beginner-friendly tasks
- `help wanted`: maintainer assistance requested

## Maintainer Contact

For maintainership and roadmap questions, open a GitHub issue with the `documentation` or `enhancement` label and mention `@devSuryansh`.
