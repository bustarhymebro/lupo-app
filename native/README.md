# Lupo native app

A new SwiftUI implementation, isolated from the legacy website and Swift scaffold. Open `Lupo.xcodeproj` in Xcode 16 or later. The target supports iPhone on iOS 17 and later. Select your development team before running on a physical device.

The app includes adoption, scheduled daily goals, earned meals, nourishment, permanent bond growth, five illustrated wolf forms, a focus timer, discoveries, local persistence, JSON backup export and restore, and a StoreKit membership integration. It does not block other apps or verify Screen Time.

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

Configure these auto-renewable products in one subscription group in App Store Connect before testing purchases:

- `com.chlebholdings.lupo.plus.monthly`
- `com.chlebholdings.lupo.plus.annual`

Prices are loaded from StoreKit and never hardcoded. Empty product results display an unavailable state. Purchase cancellation, pending approval and verification errors do not unlock membership. Current entitlements and transaction updates drive access; restore uses `AppStore.sync()`.

The current premium content is limited to environment variants. A substantive paid package, sandbox lifecycle verification, and review of the final subscription value are release prerequisites. No production subscription offering is configured by this repository.

## Release requirements

- Full iPhone simulator and physical-device QA, including accessibility, Dynamic Type, reduced motion, small-screen layout and background focus behavior.
- Final icon asset catalog and marketing screenshots.
- StoreKit sandbox purchase, cancellation, pending, refund, grace-period and cross-device restore tests.
- Accurate native support/privacy pages and App Store privacy declarations.
- Confirmed Developer membership, signing, App Store Connect products and required agreements.
- Signed archive and TestFlight validation.
- Separate Family Controls approval and implementation before any Screen Time verification claim.

The root legacy readiness documents describe a different implementation. They are not release evidence for this target.

## Assets

The wolf forms and woodland background are original generated project assets under `Resources/`. They are independently layered so the app can animate character responses without moving interface controls. Resource files preserve the generated image alpha and are framed with complete ears, paws and tails.
