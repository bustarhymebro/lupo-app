import Foundation

public struct ReminderPreference: Codable, Equatable, Sendable {
    public let hour: Int
    public let minute: Int
    public init(hour: Int, minute: Int) { self.hour = hour; self.minute = minute }
}

public struct PlannedReminder: Equatable, Sendable {
    public let day: String
    public let date: Date
    public let goal: String
}

public enum ReminderPlanner {
    /// One quiet reminder per game day, at most fourteen pending requests.
    /// Non-repeating requests avoid reminding indefinitely after a person stops visiting.
    public static func plan(state: Companion, now: Date, clock: GameClock = GameClock()) -> [PlannedReminder] {
        guard state.onboarded, let preference = state.reminder,
              (0...23).contains(preference.hour), (0...59).contains(preference.minute),
              let start = clock.date(max(clock.key(now), state.lastDay)) else { return [] }
        return (0..<14).compactMap { offset in
            guard let civil = clock.calendar.date(byAdding: .day, value: offset, to: start) else { return nil }
            let key = clock.key(civil)
            let deliveryDay = preference.hour < 4 ? clock.calendar.date(byAdding: .day, value: 1, to: civil)! : civil
            var components = clock.calendar.dateComponents([.year, .month, .day], from: deliveryDay)
            components.hour = preference.hour; components.minute = preference.minute
            guard let date = clock.calendar.date(from: components), date > now else { return nil }
            let day = state.days[key] ?? Day(scheduled: state.habits.filter { $0.weekdays.contains(clock.weekday(key)) })
            guard !day.rest, let goal = day.scheduled.first(where: { !day.completed.contains($0.id) }) else { return nil }
            return PlannedReminder(day: key, date: date, goal: goal.title)
        }
    }
}
