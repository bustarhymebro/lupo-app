# Lupo

A dark, premium screen-time discipline app. Raise a wolf through 500 permanent micro-levels by staying under your daily screen-time limit. Levels never reset, the wolf never dies.

Bundle ID: `com.chlebholdings.lupo`

## Web PWA (`docs/`, live at raiselupo.chleb.ai)

The shipping product. Vanilla JS ES modules, no build step, GitHub Pages from `docs/`. The waitlist is the homepage (`index.html`); the app lives at `/app.html`.

- `js/xp.js` — logistic XP curve (`stepCost`), 500-level threshold cache, stages/ranks/moon phases, milestone + cosmetics catalogs
- `js/state.js` — `lupo.v3` localStorage persistence, 4 AM day-roll clock, one-time `lupo.v2` migration
- `js/engine.js` — daily XP budget (+20 check-in, +50 under-limit × streak multiplier, +10×3 habits, 180/day cap), streak freezes (3/month), rest days, overnight hunts with variable discoveries, prestige cycles
- `js/wolf.js` / `js/ui.js` / `js/confetti.js` / `js/sharecard.js` — living wolf (idle fidgets, moods, evolution ceremony), four tabs (Wolf / Today / Journey / Den), celebrations, canvas share cards
- `tools/verify.py` — Playwright smoke test: walks onboarding + the full daily loop, asserts engine math, writes screenshots to `tools/shots/`

Deploy = push to `main`, then bump `CACHE` in `docs/sw.js`. Product spec: `docs/STRATEGY.md` (decisions locked).

## Native iOS (`Lupo/`, scaffold)

---

## Xcode Setup

### 1. Create the Xcode Project

1. Open Xcode → File → New → Project
2. Choose **iOS → App**
3. Product Name: `Lupo`
4. Bundle Identifier: `com.chlebholdings.lupo`
5. Interface: **SwiftUI**
6. Language: **Swift**
7. Uncheck "Include Tests" if desired
8. Save to `/tmp/lupo/` (or your preferred location)

### 2. Add Source Files

The project uses two targets: **Lupo** (main app) and **LupoWidget** (WidgetKit extension).

#### Main App Target — `Lupo/`

Create the following groups and add files:

```
Lupo/
├── LupoApp.swift
├── ContentView.swift
├── Extensions/
│   └── Color+Hex.swift
├── Models/
│   ├── Pet.swift
│   ├── Habit.swift
│   └── DailyLog.swift
├── ViewModels/
│   └── AppViewModel.swift
├── Services/
│   ├── PersistenceManager.swift
│   ├── NotificationManager.swift
│   └── ScreenTimeManager.swift
├── Components/
│   ├── PetArtView.swift
│   ├── EnergyBarView.swift
│   ├── HabitCard.swift
│   └── StreakBadge.swift
└── Views/
    ├── HomeView.swift
    ├── HabitsView.swift
    ├── StatsView.swift
    ├── PaywallView.swift
    └── Onboarding/
        ├── OnboardingView.swift
        ├── WelcomePage.swift
        ├── NameYourPupPage.swift
        └── ChooseHabitsPage.swift
```

When adding files in Xcode, make sure each file's Target Membership is set to **Lupo** only (not LupoWidget), except:
- `Pet.swift`, `Habit.swift`, `DailyLog.swift`, `Color+Hex.swift`, `PetArtView.swift` — add these to **both targets** so the widget can use them.

#### Widget Target — `LupoWidget/`

```
LupoWidget/
└── LupoWidget.swift
```

---

## Adding the Widget Target

1. In Xcode, go to **File → New → Target**
2. Choose **Widget Extension**
3. Product Name: `LupoWidget`
4. Bundle ID: `com.chlebholdings.lupo.widget`
5. Uncheck "Include Configuration App Intent" (we use StaticConfiguration)
6. Click Finish
7. Delete the auto-generated `LupoWidget.swift` and replace with the file from this project
8. Add the shared model files (`Pet.swift`, `Habit.swift`, `DailyLog.swift`, `Color+Hex.swift`, `PetArtView.swift`) to the LupoWidget target membership

---

## App Groups Setup (Required for Widget Data Sharing)

The widget reads pet data from a shared `UserDefaults` suite. You must configure an App Group.

1. In Xcode, select the **Lupo** target → Signing & Capabilities → **+ Capability → App Groups**
2. Add group: `group.com.chlebholdings.lupo`
3. Repeat for the **LupoWidget** target — add the same group ID
4. In Apple Developer portal, ensure both App IDs have the App Groups entitlement enabled with this group ID

The `PersistenceManager` and `LupoWidget` already use `UserDefaults(suiteName: "group.com.chlebholdings.lupo")`.

---

## Required Capabilities

Add all of the following in **Xcode → Target → Signing & Capabilities**:

| Capability | Target | Notes |
|---|---|---|
| App Groups | Lupo + LupoWidget | `group.com.chlebholdings.lupo` |
| Push Notifications | Lupo | Required for daily wolf reminders |
| Family Controls | Lupo | **Requires Apple entitlement approval** — see below |

---

## Family Controls Entitlement (Screen Time)

The Screen Time feature requires a special entitlement from Apple that **cannot be self-provisioned**.

### Request Steps

1. Go to: **https://developer.apple.com/contact/request/family-controls-distribution**
2. Sign in with your Apple Developer account (`chleb@chlebholdings.com`)
3. In the request form, include:
   - **App Name**: Lupo
   - **Bundle ID**: com.chlebholdings.lupo
   - **Use Case**: "We use Family Controls to enforce the user's own chosen daily screen time limit as part of a self-discipline habit tracker. The user sets a personal limit during onboarding; the app enforces it using DeviceActivity monitoring to help them build consistent focus habits. No parental controls or child management features are involved."
4. Approval typically takes 1–4 weeks

### After Approval

1. Add the `com.apple.developer.family-controls` entitlement to your `.entitlements` file:
   ```xml
   <key>com.apple.developer.family-controls</key>
   <true/>
   ```
2. Add to your target: **Signing & Capabilities → Family Controls**
3. Add to `Info.plist`:
   ```xml
   <key>NSFamilyControlsUsageDescription</key>
   <string>Lupo tracks your screen time to enforce the daily limit you set. This helps you stay disciplined and grow your wolf.</string>
   ```
4. Uncomment the real implementation in `ScreenTimeManager.swift`
5. Add DeviceActivity framework: **Target → Frameworks, Libraries → + → DeviceActivity.framework**
6. Add ManagedSettings framework similarly
7. Create a **DeviceActivityMonitor extension** target for background monitoring callbacks

---

## RevenueCat Setup (In-App Purchases)

### Install via Swift Package Manager

1. In Xcode: **File → Add Package Dependencies**
2. URL: `https://github.com/RevenueCat/purchases-ios`
3. Version: latest stable
4. Add to **Lupo** target only

### Configure in `LupoApp.swift`

Add the following to the `LupoApp` init or `onAppear`:

```swift
import RevenueCat

// In LupoApp init:
Purchases.configure(withAPIKey: "your_revenuecat_api_key_here")
```

### Get your API key

1. Create an account at **https://app.revenuecat.com**
2. Create a new project → iOS app
3. Copy the Public SDK Key (starts with `appl_`)
4. Set up your Annual subscription product in App Store Connect:
   - Product ID suggestion: `com.chlebholdings.lupo.premium.annual`
   - Price: $39.99/year
5. Add the product to a RevenueCat Offering

### Replace PaywallView stubs

In `PaywallView.swift`, replace the `handlePurchase()` and `handleRestore()` stubs:

```swift
// handlePurchase():
let offerings = try await Purchases.shared.offerings()
if let package = offerings.current?.annual {
    let result = try await Purchases.shared.purchase(package: package)
    if !result.userCancelled {
        viewModel.isPremium = true
        dismiss()
    }
}

// handleRestore():
let customerInfo = try await Purchases.shared.restorePurchases()
viewModel.isPremium = customerInfo.entitlements["premium"]?.isActive == true
```

---

## Deployment Target & Minimum iOS

- Minimum deployment: **iOS 16.0**
- Xcode: 15.0 or later
- Swift: 5.9+

Set in: **Target → General → Minimum Deployments → iOS 16.0**

---

## TestFlight Submission Checklist

Before submitting to TestFlight:

- [ ] Bundle ID matches: `com.chlebholdings.lupo`
- [ ] Version and Build number set (e.g., 1.0 build 1)
- [ ] Signing: Automatic with your Apple Developer account
- [ ] App Groups enabled in both targets
- [ ] Push Notifications capability added
- [ ] `NSUserNotificationsUsageDescription` in Info.plist
- [ ] `NSFamilyControlsUsageDescription` in Info.plist (even if entitlement pending)
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) created — declare UserDefaults usage
- [ ] App icon added to Assets.xcassets (1024x1024 PNG, no alpha)
- [ ] Launch screen / splash configured
- [ ] RevenueCat configured with real API key
- [ ] StoreKit products created in App Store Connect
- [ ] Archive: Product → Archive → Distribute App → TestFlight
- [ ] Add beta testers in App Store Connect → TestFlight

### Required Info.plist keys

```xml
<key>NSUserNotificationUsageDescription</key>
<string>Lupo sends daily reminders to log your habits and keep your wolf alive.</string>

<key>NSFamilyControlsUsageDescription</key>
<string>Lupo tracks your screen time to enforce the daily limit you chose. This is how your wolf measures your discipline.</string>

<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

---

## Design Reference

| Token | Hex |
|---|---|
| Background | `#0A0A0A` |
| Surface | `#141414` |
| Surface 2 | `#1C1C1C` |
| Surface 3 | `#242424` |
| Accent (gold) | `#F5A623` |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#A0A0A0` |
| Success | `#22C55E` |
| Danger | `#EF4444` |
| Border | `#2A2A2A` |

## Wolf Growth Stages

| Stage | Name | Levels |
|---|---|---|
| 0 | Newborn Pup | 1–10 |
| 1 | Young Pup | 11–40 |
| 2 | Adolescent | 41–120 |
| 3 | Sub-Adult | 121–300 |
| 4 | Adult Wolf | 301–500 |

Ranks every 100 levels: Whelp → Yearling → Hunter → Alpha → Moonborn. Moon-phase sub-tiers every 25. Prestige ("New Moon Cycle") at 500.
