import Foundation

// MARK: - HabitType

enum HabitType: String, Codable, CaseIterable {
    case screenTime
    case sleep
    case workout
    case focus

    var displayName: String {
        switch self {
        case .screenTime: return "Screen Time"
        case .sleep:      return "Sleep"
        case .workout:    return "Workout"
        case .focus:      return "Focus"
        }
    }

    var icon: String {
        switch self {
        case .screenTime: return "iphone"
        case .sleep:      return "moon.fill"
        case .workout:    return "figure.run"
        case .focus:      return "brain.head.profile"
        }
    }

    var description: String {
        switch self {
        case .screenTime:
            return "Stay under your daily screen time limit. Tracked automatically via iOS."
        case .sleep:
            return "Hit your nightly sleep target. Log manually or via Health app."
        case .workout:
            return "Complete a workout of at least your target duration."
        case .focus:
            return "Deep work: no distractions, full concentration. Log your session."
        }
    }

    var defaultTarget: Double {
        switch self {
        case .screenTime: return 3.0   // hours
        case .sleep:      return 7.5   // hours
        case .workout:    return 30.0  // minutes
        case .focus:      return 2.0   // hours
        }
    }

    var unit: String {
        switch self {
        case .screenTime: return "hrs/day"
        case .sleep:      return "hrs/night"
        case .workout:    return "minutes"
        case .focus:      return "hrs/day"
        }
    }

    var isRequired: Bool {
        switch self {
        case .screenTime: return true
        default:          return false
        }
    }

    var min: Double {
        switch self {
        case .screenTime: return 1.0
        case .sleep:      return 5.0
        case .workout:    return 10.0
        case .focus:      return 0.5
        }
    }

    var max: Double {
        switch self {
        case .screenTime: return 6.0
        case .sleep:      return 10.0
        case .workout:    return 120.0
        case .focus:      return 8.0
        }
    }

    var step: Double {
        switch self {
        case .screenTime: return 0.5
        case .sleep:      return 0.5
        case .workout:    return 5.0
        case .focus:      return 0.5
        }
    }
}

// MARK: - Habit

struct Habit: Codable, Identifiable {
    var id: UUID
    var type: HabitType
    var isEnabled: Bool
    var target: Double
    var isRequired: Bool

    static func makeDefault(type: HabitType) -> Habit {
        Habit(
            id: UUID(),
            type: type,
            isEnabled: type.isRequired,
            target: type.defaultTarget,
            isRequired: type.isRequired
        )
    }

    static func defaultHabits() -> [Habit] {
        HabitType.allCases.map { makeDefault(type: $0) }
    }
}
