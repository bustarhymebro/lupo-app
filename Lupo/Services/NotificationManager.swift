import Foundation
import UserNotifications

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    // MARK: - Wolf-personality notification bodies

    private let thrivingBodies: [String] = [
        "Lupo is thriving. Don't be the reason that changes.",
        "You're on a streak. Wolves don't break streaks.",
        "Another day. Another chance to prove you mean it.",
        "He's watching your discipline. Keep going."
    ]

    private let goodBodies: [String] = [
        "Log your habits. He's waiting.",
        "You've been consistent. Don't let tonight be the exception.",
        "Every day counts. This one too."
    ]

    private let neutralBodies: [String] = [
        "Lupo is unimpressed. Change that.",
        "Average effort. Is that really who you are?",
        "He expects more. So should you.",
        "Log in. Do the work. No excuses."
    ]

    private let disappointedBodies: [String] = [
        "He's fading. You're doing that.",
        "Lupo is disappointed. So should you be.",
        "Miss another day and he regresses. Your call.",
        "This is how streaks die. Don't let yours."
    ]

    private let strugglingBodies: [String] = [
        "He's struggling because you aren't showing up.",
        "Last warning before he regresses. Fix it.",
        "A wolf this young can't afford your inconsistency.",
        "You built him up to tear him down? Log your habits."
    ]

    private func body(for mood: PetMood) -> String {
        let bodies: [String]
        switch mood {
        case .thriving:     bodies = thrivingBodies
        case .good:         bodies = goodBodies
        case .neutral:      bodies = neutralBodies
        case .disappointed: bodies = disappointedBodies
        case .struggling:   bodies = strugglingBodies
        }
        return bodies.randomElement() ?? "Log your habits. Lupo is waiting."
    }

    // MARK: - Permission

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("[NotificationManager] Permission error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Scheduling

    func scheduleDaily(hour: Int, minute: Int, mood: PetMood) {
        cancelAll()

        let content = UNMutableNotificationContent()
        content.title = "Lupo"
        content.body = body(for: mood)
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(
            identifier: "lupo.daily",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationManager] Schedule error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Cancel

    func cancelAll() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    // MARK: - Update mood-based notification

    func updateDailyNotification(mood: PetMood) {
        // Reschedule at default 8 PM with updated wolf mood message
        scheduleDaily(hour: 20, minute: 0, mood: mood)
    }
}
