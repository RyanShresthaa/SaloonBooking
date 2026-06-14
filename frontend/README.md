# Salon frontend (Vite + React)

## Local development (API + Socket.IO)

1. Start the **backend** from `../backend` (default **http://localhost:5000**): `npm run dev`
2. Start this app: `npm run dev`

With **no** `VITE_API_URL` in dev, the SPA uses **same-origin** `/api` and `/socket.io`; Vite **proxies** those to the API (see `vite.config.ts`). That avoids `ERR_CONNECTION_REFUSED` when the UI runs on port **5173** but the API is on **5000**.

- If the API runs elsewhere, set **`VITE_DEV_PROXY_TARGET`** (e.g. `http://localhost:3001`) in `.env` next to `vite.config.ts`, or set **`VITE_API_URL`** / **`VITE_SOCKET_URL`** explicitly (direct calls; no proxy for HTTP in that case).

### Currency display

Prices in the UI use the prefix **`NRP`** by default (see `src/lib/utils/currency.ts`). To use another label (e.g. **`NPR`** or **`Rs.`**), set in `.env`:

`VITE_CURRENCY_PREFIX=NPR`

Numeric amounts in the database are unchanged; only labels/formatting change.

### Demo request page (`/demo`)

After a guest submits the demo form:

- **Without** `VITE_DEMO_CONTACT_EMAIL`, the app **copies** the formatted request to the clipboard (or shows a fallback if the browser blocks clipboard access). That is the “paste into an email” message you see on the thank-you screen.
- **With** `VITE_DEMO_CONTACT_EMAIL` set to a valid address in **`frontend/.env.local`**, submit opens the visitor’s **mail client** (`mailto:`) with subject and body pre-filled — one tap to send to your team.

Optional: `VITE_DEMO_CALENDAR_URL` (must start with `http://` or `https://`) can point to Calendly or another booking link on the same page.

Example `.env.local` lines:

```env
VITE_DEMO_CONTACT_EMAIL=hello@yourstudio.com
# VITE_DEMO_CALENDAR_URL=https://calendly.com/your-org/demo
```

Restart `npm run dev` after changing env vars.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
