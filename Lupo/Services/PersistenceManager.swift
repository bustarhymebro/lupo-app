import Foundation

final class PersistenceManager {
    static let shared = PersistenceManager()

    // Use an App Group suite so the widget can share data
    private let defaults: UserDefaults
    private let appGroupID = "group.com.chlebholdings.lupo"

    private enum Keys {
        static let pet = "lupo.pet"
        static let habits = "lupo.habits"
        static let logs = "lupo.logs"
        static let onboardingComplete = "lupo.onboardingComplete"
    }

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private init() {
        if let grouped = UserDefaults(suiteName: "group.com.chlebholdings.lupo") {
            self.defaults = grouped
        } else {
            self.defaults = .standard
        }
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Pet

    func savePet(_ pet: Pet) {
        guard let data = try? encoder.encode(pet) else { return }
        defaults.set(data, forKey: Keys.pet)
    }

    func loadPet() -> Pet? {
        guard let data = defaults.data(forKey: Keys.pet) else { return nil }
        return try? decoder.decode(Pet.self, from: data)
    }

    // MARK: - Habits

    func saveHabits(_ habits: [Habit]) {
        guard let data = try? encoder.encode(habits) else { return }
        defaults.set(data, forKey: Keys.habits)
    }

    func loadHabits() -> [Habit]? {
        guard let data = defaults.data(forKey: Keys.habits) else { return nil }
        return try? decoder.decode([Habit].self, from: data)
    }

    // MARK: - Logs

    func saveLogs(_ logs: [DailyLog]) {
        // Keep last 90 days to avoid bloat
        let trimmed = Array(logs.suffix(90))
        guard let data = try? encoder.encode(trimmed) else { return }
        defaults.set(data, forKey: Keys.logs)
    }

    func loadLogs() -> [DailyLog] {
        guard let data = defaults.data(forKey: Keys.logs) else { return [] }
        return (try? decoder.decode([DailyLog].self, from: data)) ?? []
    }

    func appendLog(_ log: DailyLog) {
        var logs = loadLogs()
        // Replace existing log for the same date if present
        logs.removeAll { Calendar.current.isDate($0.date, inSameDayAs: log.date) }
        logs.append(log)
        logs.sort { $0.date < $1.date }
        saveLogs(logs)
    }

    // MARK: - Onboarding

    func setOnboardingComplete(_ complete: Bool) {
        defaults.set(complete, forKey: Keys.onboardingComplete)
    }

    func isOnboardingComplete() -> Bool {
        defaults.bool(forKey: Keys.onboardingComplete)
    }

    // MARK: - Widget-shared data helpers

    func saveWidgetData(petName: String, stage: Int, streak: Int, mood: String) {
        defaults.set(petName, forKey: "widget.petName")
        defaults.set(stage, forKey: "widget.stage")
        defaults.set(streak, forKey: "widget.streak")
        defaults.set(mood, forKey: "widget.mood")
    }
}
