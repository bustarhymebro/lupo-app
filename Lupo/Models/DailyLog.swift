import Foundation

struct DailyLog: Codable, Identifiable {
    var id: UUID
    var date: Date
    var habitResults: [HabitResult]

    var allRequiredCompleted: Bool {
        let required = habitResults.filter { $0.isRequired }
        guard !required.isEmpty else { return false }
        return required.allSatisfy { $0.completed }
    }

    var completionRate: Double {
        guard !habitResults.isEmpty else { return 0.0 }
        let completed = habitResults.filter { $0.completed }.count
        return Double(completed) / Double(habitResults.count)
    }

    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    // MARK: - HabitResult

    struct HabitResult: Codable, Identifiable {
        var id: UUID
        var habitId: UUID
        var habitType: HabitType
        var completed: Bool
        var isRequired: Bool
        var value: Double?
    }

    // MARK: - Factory

    static func new(for date: Date, habits: [Habit]) -> DailyLog {
        let results = habits.filter { $0.isEnabled }.map { habit in
            HabitResult(
                id: UUID(),
                habitId: habit.id,
                habitType: habit.type,
                completed: false,
                isRequired: habit.isRequired,
                value: nil
            )
        }
        return DailyLog(id: UUID(), date: date, habitResults: results)
    }
}
