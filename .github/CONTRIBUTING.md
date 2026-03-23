# Contributing

Thanks for contributing to Audioform.

## Workflow

1. Create a branch from `main`
2. Make focused changes with clear commit messages
3. Run the relevant checks before opening a PR
4. Open a pull request with context, screenshots, and rollout notes when applicable

## Development

```bash
npm install
npm run dev
```

Validate before opening a PR:

```bash
npm run verify
```

If your change affects deployment or schema behavior, review:

- `docs/internal/DEPLOYMENT_P0_BETA.md`
- `docs/internal/DATABASE_SETUP_SUPABASE.md`

## Pull Request Guidelines

- Keep PRs scoped to one change set
- Describe the problem, the approach, and any user-facing impact
- Include screenshots for UI changes
- Note environment, migration, or deployment requirements explicitly
- Do not commit secrets, `.env` files, or production credentials

## Documentation

- Keep the root GitHub surface concise
- Put product docs in `docs/product/`
- Put active operator runbooks in `docs/internal/`
- Put historical notes in `docs/archive/`
