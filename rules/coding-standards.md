# Coding standards

This project has two runtimes. Follow the conventions for the layer you are in.

---

## Python (backend — FastAPI)

### Naming
- Variables, functions, methods: `snake_case`
- Classes: `PascalCase`
- Constants and module-level config: `SCREAMING_SNAKE_CASE`
- Files and modules: `snake_case`
- Pydantic model fields: `snake_case`

### Types
- Type hints required on all function signatures — parameters and return types
- Use `from __future__ import annotations` for forward references
- No untyped `dict` passed between functions — define a Pydantic model or TypedDict

### Docstrings
- Google-style docstrings on all non-trivial functions and classes
- One-liner docstring acceptable for simple functions
- No docstrings on private helpers that are self-explanatory

### General
- Max 40 lines per function. If longer, extract.
- Max 3 parameters. If more, use a Pydantic model.
- Pure functions preferred — no side effects unless necessary.
- Always handle the error case explicitly — never bare `except:`.
- Group imports: stdlib → third-party → internal. Blank line between groups.
- No wildcard imports (`from module import *`).

---

## TypeScript (frontend — Next.js)

### Naming
- Variables and functions: `camelCase`
- Components and classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case` (except components: `PascalCase.tsx`)
- Be descriptive — `getUserById` not `getUser`, `isLoading` not `loading`

### Types
- No `any` without a comment explaining why
- Prefer `interface` for object shapes, `type` for unions and primitives
- No untyped props — all component props must have a defined interface

### Comments
- JSDoc on all exported functions and components
- Comment the *why*, not the *what*

### General
- Max 40 lines per function. If longer, extract.
- Prefer `const` over `let`. Never `var`.
- No magic numbers — name your constants.
- No commented-out code in commits — delete it.
- Absolute imports preferred over relative (configured in `tsconfig.json`).
- Group imports: external → internal → styles. Blank line between groups.
- No wildcard imports (`import * as foo`).

---

## Both runtimes

- Delete dead code. We have git history.
- No `console.log` or `print()` debug statements in committed code.
- Error handling: never swallow silently. Always log with enough context to debug.
- User-facing errors: human readable — never expose stack traces or internal details.
- No hardcoded credentials, tokens, or secrets — always use environment variables.
