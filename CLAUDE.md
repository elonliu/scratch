# Scratch - Development Guide

## Project Overview

Scratch is a cross-platform markdown note-taking app for macOS, Windows, and Linux, built with Tauri v2 (Rust backend) + React/TypeScript/Tailwind (frontend) + TipTap (WYSIWYG editor) + Tantivy (full-text search).

## Commands

```bash
npm run dev          # Start Vite dev server only
npm run build        # Build frontend (tsc + vite)
npm run tauri dev    # Run full app in development mode
npm run tauri build  # Build production app
```

## CI

Runs on every push to `main` and on PRs. Validates frontend build (`tsc` + Vite) and Rust compilation (`cargo check` + `cargo clippy`) on an Ubuntu runner.

## Key Patterns

- All backend operations go through Tauri commands in `src-tauri/src/lib.rs`. Frontend calls them via `invoke()` from `@tauri-apps/api/core`.
- `NotesContext` uses a dual context pattern (data/actions separated) for performance.
- Settings live in two places: app config at `{APP_DATA}/config.json`, per-folder settings at `{NOTES_FOLDER}/.scratch/settings.json`.
- Tauri v2 permissions go in `src-tauri/capabilities/default.json`.

## Coding Conventions

- Clean, minimal code with low technical debt
- Proper React patterns (contexts, hooks, memoization)
- Type-safe with TypeScript throughout
- No commented-out code or TODOs in production code
- Use `React.memo` for expensive list-item components
- Use `useCallback`/`useMemo` for performance-critical paths
- Debounce user-triggered operations (auto-save 300ms, search 150ms, file watcher 500ms, git status 1000ms)
- All operations should be non-blocking (async)
- Error handling with user-friendly messages

## Releasing

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit to `main`, then tag and push: `git tag v0.5.0 && git push origin v0.5.0`
3. The release workflow builds all platforms and creates a draft GitHub release
4. Update the description in `latest.json` from GitHub after the action finishes
5. Review, edit notes, and publish

## macOS Code Signing

macOS remembers privacy permissions (TCC) against a *code requirement*. An ad-hoc signature
records a requirement that pins the cdhash of that exact binary, so every rebuild invalidates the
user's folder access grant and macOS prompts again (issue #1).

- `scripts/macos/codesign` is a `codesign` shim. Put `scripts/macos` at the front of `PATH` and it
  rewrites the designated requirement of ad-hoc signed `.app` bundles to
  `designated => identifier "<CFBundleIdentifier>"`, which survives rebuilds.
- The release workflow sets `APPLE_SIGNING_IDENTITY=-` and prepends `scripts/macos` to `PATH`
  when no `APPLE_CERTIFICATE` secret is configured. With a Developer ID certificate the shim
  passes the call through untouched, because that signature already pins the Team ID.
- Signing enables the hardened runtime, which needs the entitlements in
  `src-tauri/Entitlements.plist` (`allow-jit`, `allow-unsigned-executable-memory`) or WKWebView
  renders a blank window.
- `scripts/macos/sign-app.sh` re-signs an already installed bundle, which repairs the permission
  state of an app that was installed before this setup existed.
