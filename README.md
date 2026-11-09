# Lupo

A cozy wolf companion for small daily routines. Completing real-life goals earns meals; nourishment supports exploration, and earned bond grows the wolf through five illustrated stages.

## Native iPhone rebuild

The active implementation is in [`native/`](native/README.md). Open `native/Lupo.xcodeproj` with full Xcode. It targets iPhone on iOS 17 or later and includes a standalone Swift core package, an app target and a UI test target.

The new app supports scheduled goals, undo, rest days, focus sessions, weekly review, guided routines, private notes, local reminders and JSON backup/restore. StoreKit verifies the optional one-time Plus unlock. The core app works without an account or purchase. Screen Time verification is not implemented.

This branch is under development. Simulator/device testing, purchase configuration and sandbox checks, signing, native policy publication and TestFlight validation are required before release. The native README describes the current checks and remaining gates. Legacy readiness reports are not evidence for this implementation.

## Existing products

- `docs/` is the existing web app served by GitHub Pages. Changes merged into `main` can deploy it.
- `Lupo/` and `LupoWidget/` are the older Swift scaffold. They are retained for reference and are not sources of the new Xcode target.
- The previous native setup instructions describe that legacy scaffold and remain in Git history.

See [`native/README.md`](native/README.md) for build, data, purchase and release details.
