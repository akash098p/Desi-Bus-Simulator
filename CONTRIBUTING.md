# Contributing to Desi Bus Simulator

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

All code changes happen through pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run the dev server
cd src/frontend
npx vite --host

# 3. Open http://localhost:5173/
```

## TypeScript

- Before submitting, run `pnpm typecheck` to ensure no type errors.
- Use the `pnpm fix` command to auto-format with Biome.

## Project Structure

```
src/
├── backend/     # Motoko backend (Internet Computer canisters)
└── frontend/    # React + Three.js game frontend
    └── src/
        ├── components/game/  # All game components
        ├── store/            # Zustand state
        └── utils/            # Utilities (sound, music)
```

## Code Style

- Follow existing code patterns in the repo.
- Use TypeScript strict mode.
- Use Biome for formatting (already configured).
- Keep components small and focused.
- Add comments for complex logic (especially physics).

## Reporting Bugs

Use the [GitHub Issues](https://github.com/your-username/desi-bus-simulator/issues) tab and include:

- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if possible
- Your environment (OS, browser, Node version)

## Feature Requests

Feature requests are welcome! Use the Issues tab with the label "enhancement" and describe:

- What the feature does
- Why it's useful
- How it should work

## License

By contributing, you agree that your contributions will be licensed under the MIT License.