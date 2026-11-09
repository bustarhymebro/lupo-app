import SwiftUI
import UserNotifications

@MainActor
final class ReminderService: ObservableObject {
    @Published private(set) var status = ""
    @Published private(set) var busy = false
    private var queued: Companion?
    private var syncing = false
    private let center = UNUserNotificationCenter.current()
    private let prefix = "lupo.routine."

    func enable(_ preference: ReminderPreference, store: LupoStore) async {
        guard !busy else { return }; busy = true; defer { busy = false }
        do {
            let allowed: Bool = try await withCheckedThrowingContinuation { continuation in
                center.requestAuthorization(options: [.alert]) { @Sendable allowed, error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume(returning: allowed) }
                }
            }
            guard allowed else { status = "Notifications are off in system settings. Your goals still work without them."; return }
            store.apply { try $0.setReminder(preference) }
            if store.message == nil { await synchronize(store.state) }
        } catch { status = "Couldn't enable reminders. Please try again." }
    }

    func synchronize(_ state: Companion) async {
        queued = state
        guard !syncing else { return }
        syncing = true
        defer { syncing = false }
        // Serialize updates; the newest saved state always gets the final schedule.
        while let snapshot = queued {
            queued = nil
            let pending: [String] = await withCheckedContinuation { continuation in
                center.getPendingNotificationRequests { @Sendable requests in continuation.resume(returning: requests.map(\.identifier)) }
            }
            center.removePendingNotificationRequests(withIdentifiers: pending.filter { $0.hasPrefix(prefix) })
            guard snapshot.reminder != nil else { status = "Reminders are off."; continue }
            let authorized: Bool = await withCheckedContinuation { continuation in
                center.getNotificationSettings { @Sendable settings in
                    continuation.resume(returning: settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional)
                }
            }
            guard authorized else {
                status = "Notifications are off in system settings."; continue
            }
            let planned = ReminderPlanner.plan(state: snapshot, now: Date())
            do {
                for item in planned {
                    let content = UNMutableNotificationContent()
                    content.title = "A little time for you"
                    content.body = "\(item.goal). One small promise is enough."
                    let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: item.date)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
                    let request = UNNotificationRequest(identifier: prefix + item.day, content: content, trigger: trigger)
                    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                        center.add(request) { @Sendable error in
                            if let error { continuation.resume(throwing: error) }
                            else { continuation.resume() }
                        }
                    }
                }
                status = planned.isEmpty ? "No unfinished goals to remind you about yet." : "Quiet reminders are set for your upcoming goal days."
            } catch { status = "Some reminders couldn't be scheduled. Open this screen to try again." }
        }
    }
}

struct RemindersView: View {
    @EnvironmentObject var store: LupoStore
    @EnvironmentObject var reminders: ReminderService
    @Environment(\.dismiss) private var dismiss
    @State private var time = Calendar.current.date(from: DateComponents(hour: 19, minute: 0)) ?? Date()
    var body: some View {
        Screen(title: "A gentle nudge", showsClose: true) {
            Text("One quiet reminder on the days you choose for your goals. No sounds, badges, or messages about a hungry wolf.").font(.title3)
            DatePicker("When works for you?", selection: $time, displayedComponents: .hourAndMinute)
            Text("Completed days and rest days are skipped. Reminders cover the next two weeks and refresh when you open Lupo. Times follow your device's local clock.").font(.subheadline).foregroundStyle(.secondary)
            ActionButton(title: store.state.reminder == nil ? "Enable quiet reminders" : "Save reminder time", icon: "bell") {
                let parts = Calendar.current.dateComponents([.hour, .minute], from: time)
                Task { await reminders.enable(ReminderPreference(hour: parts.hour!, minute: parts.minute!), store: store) }
            }.disabled(reminders.busy)
            if store.state.reminder != nil {
                Button("Turn reminders off") { store.apply { try $0.setReminder(nil) }; Task { await reminders.synchronize(store.state) } }
            }
            if !reminders.status.isEmpty { Text(reminders.status).font(.subheadline).accessibilityAddTraits(.updatesFrequently) }
            Button("Close") { dismiss() }
        }.task {
            if let saved = store.state.reminder { time = Calendar.current.date(from: DateComponents(hour: saved.hour, minute: saved.minute)) ?? time }
            await reminders.synchronize(store.state)
        }
    }
}
