# Lupo native app

A new SwiftUI implementation, isolated from the legacy website and Swift scaffold. Open `Lupo.xcodeproj` in Xcode 16 or later. The target supports iPhone on iOS 17 and later. Select your development team before running on a physical device.

The app includes adoption, scheduled daily goals, earned meals, nourishment, permanent bond growth, five illustrated wolf forms, a focus timer, discoveries, local persistence, JSON backup export and restore, optional quiet reminders, three guided trails with private notes, and a StoreKit Plus unlock. It does not block other apps or verify Screen Time.

## Development

The engine is a dependency-free Swift package. With full Xcode selected:

```sh
swift test -j 2
xcodebuild -project Lupo.xcodeproj -scheme Lupo -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

With only Command Line Tools installed, run the same core regression cases through the standalone harness:

```sh
sh tools/test-core.sh
```

`tools/generate-project.py` regenerates the checked-in project deterministically after source or resource changes. The app target compiles the engine source directly; the Swift package tests it independently. The inactive workflow template in `ci/native.yml` runs XCTest and an unsigned iPhone simulator build when installed under `.github/workflows/` by a connection with workflow permission. It is not currently running.

## Data and time

Progress is an atomically written JSON file in the app's Application Support directory. Failed saves do not apply the attempted action. A malformed save is preserved and blocks further writes until the user explicitly resets or restores a valid backup. Imported nested records are validated before replacing progress.

The game day begins at 4 a.m. in the device's current time zone. A backwards day change blocks rewards until the date catches up. This is a local habit tool, not a tamper-proof measurement system. Missed days lower nourishment but do not remove bond or discoveries. Goal edits start the next game day and preserve historical goal snapshots.

## Purchases

Configure this non-consumable product in App Store Connect before testing purchases:

- `com.chlebholdings.lupo.plus.lifetime`

Prices are loaded from StoreKit and never hardcoded. Empty product results display an unavailable state. Purchase cancellation, pending approval and verification errors do not unlock Plus. Current entitlements and transaction updates drive access; restore uses `AppStore.sync()`.

Plus is a one-time unlock for two fourteen-step guided trails and two environment variants. The seven-step fresh-start trail, daily routines, reminders, weekly review and recovery are free. Trail notes remain readable without an entitlement. No production product is configured by this repository. Sandbox purchase and refund verification and beta willingness-to-pay research remain release prerequisites.

## Release requirements

- Full iPhone simulator and physical-device QA, including accessibility, Dynamic Type, reduced motion, small-screen layout and background focus behavior.
- App icon source artwork is in `Artwork/icon-source.png`; compile the final icon asset catalog and capture marketing screenshots.
- StoreKit sandbox purchase, cancellation, pending, refund and cross-device restore tests.
- Accurate native support/privacy pages and App Store privacy declarations.
- Confirmed Developer membership, signing, App Store Connect products and required agreements.
- Signed archive and TestFlight validation.
- Separate Family Controls approval and implementation before any Screen Time verification claim.

The root legacy readiness documents describe a different implementation. They are not release evidence for this target.

## Assets

The wolf forms and woodland background are original generated project assets under `Resources/`. They are independently layered so the app can animate character responses without moving interface controls. Resource files preserve the generated image alpha and are framed with complete ears, paws and tails.

## Reminders and trails

Reminder permission is requested only after the person enables reminders. Requests are local and silent, with no badge. Up to fourteen game days are scheduled; completed days, rest days and unscheduled days are skipped. Opening the app refreshes the schedule. An after-midnight reminder before 4 a.m. belongs to the preceding game day. Delivery remains subject to OS settings and Focus. iPhone notification delivery still needs device verification.

Guided trails advance at most one step per game day and have no expiry deadline. Each completed step earns one meal and ten bond. Switching trails keeps prior notes and cannot reset the daily reward. Rest days block rewards. Backups preserve notes and validate their dates, lengths and progression before restore.

`Support/` contains native-specific privacy and support page drafts. They must be reviewed and published at the URLs used by the app before TestFlight distribution; the current live pages still describe the legacy web product.
