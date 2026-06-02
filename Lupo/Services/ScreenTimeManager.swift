// MARK: - ScreenTimeManager
// NOTE: Requires com.apple.developer.family-controls entitlement.
// Request at: https://developer.apple.com/contact/request/family-controls-distribution
// In your request, explain: "We use Family Controls to enforce the user's own chosen
// screen time limit as part of a self-discipline habit tracker app (Lupo). The user
// sets a daily limit and the app enforces it to help them build better habits."
// This entitlement must be approved BEFORE submitting to the App Store.

import Foundation
import Combine

// MARK: - Authorization Status

enum ScreenTimeAuthorizationStatus {
    case notDetermined
    case approved
    case denied
}

// MARK: - ScreenTimeManager

@MainActor
final class ScreenTimeManager: ObservableObject {
    static let shared = ScreenTimeManager()

    @Published var authorizationStatus: ScreenTimeAuthorizationStatus = .notDetermined
    @Published var todayUsageHours: Double = 0.0
    @Published var isMonitoring: Bool = false

    private init() {
        loadAuthorizationStatus()
    }

    private func loadAuthorizationStatus() {
        // Persist authorization state across launches
        let stored = UserDefaults.standard.string(forKey: "screenTime.authStatus") ?? "notDetermined"
        switch stored {
        case "approved": authorizationStatus = .approved
        case "denied":   authorizationStatus = .denied
        default:         authorizationStatus = .notDetermined
        }
    }

    // MARK: - Authorization

    /// Requests Family Controls authorization.
    /// Actual implementation requires the DeviceActivity and ManagedSettings frameworks
    /// and the com.apple.developer.family-controls entitlement.
    func requestAuthorization() async {
        // Real implementation (uncomment after entitlement approval):
        //
        // import FamilyControls
        // let center = AuthorizationCenter.shared
        // do {
        //     try await center.requestAuthorization(for: .individual)
        //     authorizationStatus = .approved
        //     UserDefaults.standard.set("approved", forKey: "screenTime.authStatus")
        // } catch {
        //     authorizationStatus = .denied
        //     UserDefaults.standard.set("denied", forKey: "screenTime.authStatus")
        //     print("[ScreenTimeManager] Authorization error: \(error.localizedDescription)")
        // }

        // Placeholder behavior for builds without entitlement:
        authorizationStatus = .notDetermined
    }

    // MARK: - Monitoring

    /// Starts monitoring device activity with the given daily limit.
    /// Requires DeviceActivity framework and approved entitlement.
    @available(iOS 16.0, *)
    func startMonitoring(dailyLimitHours: Double) {
        guard authorizationStatus == .approved else { return }

        // Real implementation (uncomment after entitlement approval):
        //
        // import DeviceActivity
        // import ManagedSettings
        //
        // let limitSeconds = dailyLimitHours * 3600
        // let schedule = DeviceActivitySchedule(
        //     intervalStart: DateComponents(hour: 0, minute: 0),
        //     intervalEnd: DateComponents(hour: 23, minute: 59),
        //     repeats: true
        // )
        // let event = DeviceActivityEvent(
        //     applications: [], // populated from user selection via FamilyActivityPicker
        //     threshold: DateComponents(second: Int(limitSeconds))
        // )
        // let center = DeviceActivityCenter()
        // do {
        //     try center.startMonitoring(
        //         .daily,
        //         during: schedule,
        //         events: [.screenTimeLimit: event]
        //     )
        //     isMonitoring = true
        // } catch {
        //     print("[ScreenTimeManager] Monitoring error: \(error.localizedDescription)")
        // }

        isMonitoring = false // placeholder
    }

    // MARK: - Usage Fetching

    /// Returns today's total screen usage in hours.
    /// Requires DeviceActivity framework.
    @available(iOS 16.0, *)
    func fetchTodayUsage() async -> Double {
        guard authorizationStatus == .approved else { return 0.0 }

        // Real implementation (uncomment after entitlement approval):
        //
        // Use DeviceActivityReport extension to aggregate usage.
        // DeviceActivityReport is a SwiftUI view extension — fetching raw data
        // requires a DeviceActivityReportExtension target.
        // See: https://developer.apple.com/documentation/deviceactivity
        //
        // For manual fallback, read from shared UserDefaults written by the
        // DeviceActivityMonitor extension:
        // let hours = UserDefaults(suiteName: appGroupID)?.double(forKey: "screenTime.todayHours") ?? 0.0
        // return hours

        // Placeholder: return stored manual override
        let stored = UserDefaults.standard.double(forKey: "screenTime.manualHours")
        return stored
    }

    // MARK: - Manual Override (for builds without entitlement)

    /// Allows user to manually log their screen time when entitlement is unavailable.
    func setManualUsage(hours: Double) {
        todayUsageHours = hours
        UserDefaults.standard.set(hours, forKey: "screenTime.manualHours")
    }

    /// Returns true if the user is under their screen time limit today.
    func isUnderLimit(limitHours: Double) -> Bool {
        todayUsageHours <= limitHours
    }
}

// MARK: - DeviceActivity Extension Name (for DeviceActivityMonitor target)
// In your DeviceActivityMonitor extension, use:
// extension DeviceActivityName {
//     static let daily = Self("daily")
// }
// extension DeviceActivityEvent.Name {
//     static let screenTimeLimit = Self("screenTimeLimit")
// }
