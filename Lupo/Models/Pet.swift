import Foundation

// MARK: - PetStage

enum PetStage: Int, Codable, CaseIterable {
    case newbornPup = 0
    case youngPup = 1
    case adolescent = 2
    case subAdult = 3
    case adultWolf = 4

    var displayName: String {
        switch self {
        case .newbornPup:  return "Newborn Pup"
        case .youngPup:    return "Young Pup"
        case .adolescent:  return "Adolescent"
        case .subAdult:    return "Sub-Adult"
        case .adultWolf:   return "Adult Wolf"
        }
    }

    var daysRequired: Int {
        switch self {
        case .newbornPup:  return 0
        case .youngPup:    return 7
        case .adolescent:  return 14
        case .subAdult:    return 28
        case .adultWolf:   return 42
        }
    }

    var tagline: String {
        switch self {
        case .newbornPup:  return "Fragile. Watching. Waiting for you to prove yourself."
        case .youngPup:    return "Eyes open. The pack awaits — if you're worthy."
        case .adolescent:  return "Testing his strength. Testing yours."
        case .subAdult:    return "Power building. Discipline sharpening. Don't stop now."
        case .adultWolf:   return "He runs with no pack but the one he chose. You built this."
        }
    }

    var moodMessages: [PetMood: String] {
        switch self {
        case .newbornPup:
            return [
                .thriving:     "You're keeping up. Don't let it slip.",
                .good:         "Decent start. He's watching you.",
                .neutral:      "Barely enough. He expects more.",
                .disappointed: "You're already falling short.",
                .struggling:   "You're failing a pup who can't fight back yet."
            ]
        case .youngPup:
            return [
                .thriving:     "He's starting to trust your discipline.",
                .good:         "Not bad. Keep the streak alive.",
                .neutral:      "He can feel your inconsistency.",
                .disappointed: "He's losing faith in you.",
                .struggling:   "He whimpers when you don't show up."
            ]
        case .adolescent:
            return [
                .thriving:     "He stands taller every time you follow through.",
                .good:         "Solid. He respects your consistency.",
                .neutral:      "You're coasting. He notices.",
                .disappointed: "Weak days make a weak wolf.",
                .struggling:   "He's regressing because you are."
            ]
        case .subAdult:
            return [
                .thriving:     "Raw power. Earned by real work.",
                .good:         "He runs harder when you push harder.",
                .neutral:      "This close to greatness — and you're phoning it in.",
                .disappointed: "Don't waste what you built.",
                .struggling:   "A wolf this far along doesn't have to fall. You chose this."
            ]
        case .adultWolf:
            return [
                .thriving:     "This is what discipline looks like. Own it.",
                .good:         "He howls on your schedule. Keep it.",
                .neutral:      "A wolf this powerful deserves better habits than this.",
                .disappointed: "You've come too far to go soft.",
                .struggling:   "He remembers every day you didn't show up."
            ]
        }
    }

    var next: PetStage? {
        PetStage(rawValue: rawValue + 1)
    }

    var previous: PetStage? {
        PetStage(rawValue: rawValue - 1)
    }
}

// MARK: - PetMood

enum PetMood: String, Codable {
    case thriving
    case good
    case neutral
    case disappointed
    case struggling

    var displayName: String {
        switch self {
        case .thriving:    return "Thriving"
        case .good:        return "Good"
        case .neutral:     return "Neutral"
        case .disappointed: return "Disappointed"
        case .struggling:  return "Struggling"
        }
    }

    var wolfMessage: String {
        switch self {
        case .thriving:
            return "You're doing what you said you would. That's rare. Don't ruin it."
        case .good:
            return "Solid. Keep stacking. Momentum is a weapon — don't waste it."
        case .neutral:
            return "Average is a choice. You're choosing it right now."
        case .disappointed:
            return "You know what you should have done. So does he."
        case .struggling:
            return "He's fading. And it's on you. Show up or admit you won't."
        }
    }

    var moodColor: String {
        switch self {
        case .thriving:    return "22C55E"
        case .good:        return "F5A623"
        case .neutral:     return "A0A0A0"
        case .disappointed: return "EF4444"
        case .struggling:  return "7F1D1D"
        }
    }
}

// MARK: - Pet

struct Pet: Codable {
    var name: String
    var stage: PetStage
    var energy: Double          // 0.0–1.0
    var mood: PetMood
    var consistentDays: Int     // consecutive days all required habits completed
    var totalDaysTracked: Int
    var createdDate: Date
    var lastUpdated: Date
    var missedDaysStreak: Int   // consecutive missed days for regression logic

    var progressToNextStage: Double {
        guard let next = stage.next else { return 1.0 }
        let current = stage.daysRequired
        let nextReq = next.daysRequired
        let range = nextReq - current
        guard range > 0 else { return 1.0 }
        let progress = Double(consistentDays - current) / Double(range)
        return max(0.0, min(1.0, progress))
    }

    var daysUntilNextStage: Int? {
        guard let next = stage.next else { return nil }
        let remaining = next.daysRequired - consistentDays
        return max(0, remaining)
    }

    static func new(name: String) -> Pet {
        Pet(
            name: name,
            stage: .newbornPup,
            energy: 0.5,
            mood: .neutral,
            consistentDays: 0,
            totalDaysTracked: 0,
            createdDate: Date(),
            lastUpdated: Date(),
            missedDaysStreak: 0
        )
    }
}
