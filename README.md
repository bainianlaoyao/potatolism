# potatolism

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

## Backend (FastAPI) and Token Validation

The backend server is implemented with FastAPI under `backend/server.py`.

- Allowed tokens are defined in `backend/tokens.txt`, one token per line.
- The server reloads this file every 60 seconds. You can update tokens at runtime.
- You can override locations via environment variables:
  - `TOKEN_FILE` (default: `backend/tokens.txt`)
  - `TOKEN_REFRESH_SEC` (default: `60`)

Quick start (Windows PowerShell):

```pwsh
# Install backend deps (Python 3.10+ recommended)
pip install -r backend/requirements.txt

# Run the backend
python .\backend\server.py

# Health check
curl http://localhost:3000/health
```

To test sync from the app, set your Cloud Sync base URL to `http://localhost:3000` and token to a value present in `backend/tokens.txt` (for local dev, a default `local-dev-token` is included).

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
