# Lupo — App Store Submission Checklist
_Kept at repo root (not served on the live site)._

## Binary / Xcode project (needs a Mac + the §4 human items)
- [ ] Committed Xcode project (e.g. XcodeGen project.yml) that builds + archives cleanly (currently NONE exists)
- [ ] Bundle IDs registered: com.chlebholdings.lupo, com.chlebholdings.lupo.widget; App Group group.com.chlebholdings.lupo on BOTH targets
- [ ] Info.plist usage strings (NSUserNotificationUsageDescription, NSFamilyControlsUsageDescription); .entitlements (App Groups, Push, Family Controls); PrivacyInfo.xcprivacy (UserDefaults CA92.1); UILaunchScreen
- [ ] Assets.xcassets AppIcon (1024 flattened, no alpha) + launch screen
- [ ] Real StoreKit/RevenueCat: configure on launch, real purchase + Restore, isPremium gates >=1 feature, paywall reachable, Terms + Privacy links + full auto-renew disclosure ON the paywall
- [ ] In-app Privacy + Terms links and an in-app "Delete My Data" control (Guideline 5.1.1(v))
- [ ] Native app delivers complete value, not a thin web wrap (Guideline 4.2)
- [ ] No dead/placeholder buttons; every link resolves (2.1 / 2.3.8)

## App Store Connect metadata / legal (mostly no Mac)
- [ ] Name (<=30 chars), subtitle, promo, description matching what the binary does (no false "verified Screen Time" claim — 2.3), keywords, category (Health & Fitness or Productivity), copyright Chleb Holdings LLC
- [ ] Privacy Policy URL: https://bustarhymebro.github.io/lupo-app/privacy.html (update for native no-server behavior)
- [ ] Support URL: create docs/support.html and enter it (a bare mailto is not accepted)
- [ ] App Privacy nutrition labels (native v1 with no analytics = "Data Not Collected"; account for RevenueCat once added)
- [ ] Age rating questionnaire (expect 4+); position as individual digital-wellbeing, never parental control (5.5)
- [ ] Screenshots for required sizes (6.9-inch iPhone, 2-3 minimum)
- [ ] Paid Apps Agreement + tax/banking signed

## Sequencing
File the Family Controls entitlement and start the Apple membership FIRST (longest lead). Submit native only after entitlement approval, or ship an honest honor-system v1. The PWA can launch now as the waitlist/on-ramp.
