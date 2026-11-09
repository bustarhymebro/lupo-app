import Foundation

public struct Habit: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var cue: String
    public var symbol: String
    public var weekdays: Set<Int>
    public init(id: UUID = UUID(), title: String, cue: String, symbol: String = "leaf", weekdays: Set<Int> = Set(1...7)) {
        self.id = id; self.title = title; self.cue = cue; self.symbol = symbol; self.weekdays = weekdays
    }
}

public struct Day: Codable, Equatable, Sendable {
    public var scheduled: [Habit] = []
    public var completed: Set<UUID> = []
    public var fed = 0
    public var rest = false
    public var focusMinutes = 0
    public var expedition: String?
    public init(scheduled: [Habit]) { self.scheduled = scheduled }
}

public struct FocusSession: Codable, Equatable, Sendable {
    public var started: Date
    public var duration: Int
}

public struct Companion: Codable, Equatable, Sendable {
    public var version = 1
    public var name = "Lupo"
    public var intention = "Make time for what matters"
    public var onboarded = false
    public var nourishment = 70
    public var food = 0
    public var bond = 0
    public var lastDay: String
    public var habits: [Habit] = []
    public var days: [String: Day] = [:]
    public var discoveries: [String] = []
    public var focus: FocusSession?
    public var den = "Pine forest"
    public init(day: String) { lastDay = day }
    public var stage: String {
        switch bond { case 0..<100: "Pup"; case 100..<350: "Yearling"; case 350..<800: "Scout"; case 800..<1600: "Hunter"; default: "Alpha" }
    }
    public var mood: String {
        switch nourishment { case 0..<25: "Hungry"; case 25..<55: "Ready for a meal"; case 55..<85: "Content"; default: "Thriving" }
    }
}

public enum LupoError: Error, Equatable { case invalidGoal, noFood, alreadyDone, resting, unavailable, invalidClock, invalidSave }

/// Local-calendar days roll at 4 a.m. Comparing civil date keys prevents DST drift.
public struct GameClock: Sendable {
    public var calendar: Calendar
    public init(timeZone: TimeZone = .current) {
        calendar = Calendar(identifier: .gregorian); calendar.timeZone = timeZone
    }
    public func key(_ date: Date) -> String {
        let civil = calendar.component(.hour, from: date) < 4 ? calendar.date(byAdding: .day, value: -1, to: date)! : date
        let c = calendar.dateComponents([.year, .month, .day], from: civil)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
    public func date(_ key: String) -> Date? {
        let c = key.split(separator: "-").compactMap { Int($0) }
        guard c.count == 3 else { return nil }
        let value = calendar.date(from: DateComponents(year: c[0], month: c[1], day: c[2], hour: 12))
        guard let value, self.key(value) == key else { return nil }
        return value
    }
    public func distance(_ from: String, _ to: String) -> Int? {
        guard let a = date(from), let b = date(to) else { return nil }
        return calendar.dateComponents([.day], from: a, to: b).day
    }
    public func weekday(_ key: String) -> Int { calendar.component(.weekday, from: date(key)!) }
}

public struct Game: Sendable {
    public private(set) var state: Companion
    public let clock: GameClock
    public init(state: Companion, clock: GameClock = GameClock()) { self.state = state; self.clock = clock }

    public mutating func open(at now: Date) throws {
        let key = clock.key(now)
        guard let gap = clock.distance(state.lastDay, key), gap >= 0 else { throw LupoError.invalidClock }
        if gap > 0 {
            // Charge only elapsed days. Rest protects the declared day, never future days.
            let protected = state.days.filter { $0.key >= state.lastDay && $0.key < key && $0.value.rest }.count
            state.nourishment = max(0, state.nourishment - min(100, max(0, gap - protected) * 20))
            // Record absent days so weekly reviews include missed commitments.
            let previous = clock.date(state.lastDay)!
            for offset in max(0, gap - 366)..<gap {
                let date = clock.calendar.date(byAdding: .day, value: offset, to: previous)!
                let missedKey = clock.key(date)
                if state.days[missedKey] == nil {
                    state.days[missedKey] = Day(scheduled: state.habits.filter { $0.weekdays.contains(clock.weekday(missedKey)) })
                }
            }
            state.lastDay = key
        }
        if state.days[key] == nil {
            state.days[key] = Day(scheduled: state.habits.filter { $0.weekdays.contains(clock.weekday(key)) })
        }
    }

    public mutating func adopt(name: String, intention: String, habits: [Habit], at now: Date) throws {
        guard !state.onboarded, !habits.isEmpty, habits.count <= 3 else { throw LupoError.invalidGoal }
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty, clean.count <= 24 else { throw LupoError.invalidGoal }
        for habit in habits { try validate(habit) }
        guard Set(habits.map(\.id)).count == habits.count else { throw LupoError.invalidGoal }
        state.name = clean; state.intention = String(intention.prefix(140)); state.habits = habits
        state.onboarded = true; state.food = 1
        state.days[clock.key(now)] = Day(scheduled: habits.filter { $0.weekdays.contains(clock.weekday(clock.key(now))) })
        try open(at: now)
    }

    public mutating func complete(_ id: UUID, at now: Date) throws {
        try open(at: now)
        let key = clock.key(now)
        guard var day = state.days[key], day.scheduled.contains(where: { $0.id == id }) else { throw LupoError.invalidGoal }
        guard !day.rest else { throw LupoError.resting }
        guard !day.completed.contains(id) else { throw LupoError.alreadyDone }
        day.completed.insert(id); state.days[key] = day
        state.food = min(9, state.food + 1); state.bond += 10
    }

    public mutating func feed(at now: Date) throws {
        try open(at: now)
        guard state.food > 0, state.nourishment < 100 else { throw LupoError.noFood }
        state.food -= 1; state.nourishment = min(100, state.nourishment + 30)
        state.days[clock.key(now)]!.fed += 1
    }

    public mutating func rest(at now: Date) throws {
        try open(at: now)
        let key = clock.key(now)
        guard state.days[key]!.completed.isEmpty, state.days[key]!.focusMinutes == 0, state.focus == nil else { throw LupoError.unavailable }
        state.days[key]!.rest = true
    }

    public mutating func addHabit(_ habit: Habit, at now: Date) throws {
        try validate(habit); try open(at: now)
        guard state.habits.count < 3, !state.habits.contains(where: { $0.id == habit.id }) else { throw LupoError.invalidGoal }
        state.habits.append(habit)
        // New commitments begin tomorrow; deleting/recreating cannot farm today's rewards.
    }
    public mutating func removeHabit(_ id: UUID) { state.habits.removeAll { $0.id == id } }
    public mutating func editHabit(_ habit: Habit, at now: Date) throws {
        try validate(habit); try open(at: now)
        guard let index = state.habits.firstIndex(where: { $0.id == habit.id }) else { throw LupoError.invalidGoal }
        state.habits[index] = habit
    }

    public mutating func startFocus(minutes: Int, at now: Date) throws {
        try open(at: now)
        guard [5, 10, 25, 50].contains(minutes), state.focus == nil, state.days[clock.key(now)]?.rest == false else { throw LupoError.unavailable }
        state.focus = FocusSession(started: now, duration: minutes)
    }
    public mutating func cancelFocus() { state.focus = nil }
    public mutating func finishFocus(at now: Date) throws {
        try open(at: now)
        guard let focus = state.focus, now.timeIntervalSince(focus.started) >= Double(focus.duration * 60) else { throw LupoError.unavailable }
        let key = clock.key(now)
        guard state.days[key]?.rest == false else { throw LupoError.resting }
        // Timer measures elapsed time, not verified device abstinence. One food reward per day.
        if state.days[key]!.focusMinutes == 0 { state.food = min(9, state.food + 1); state.bond += 10 }
        state.days[key]!.focusMinutes += focus.duration; state.focus = nil
    }

    public mutating func explore(at now: Date) throws -> String {
        try open(at: now)
        let key = clock.key(now), day = state.days[clock.key(now)]!
        guard !day.rest, !day.completed.isEmpty, state.nourishment >= 25, day.expedition == nil else { throw LupoError.unavailable }
        let stories = ["A silver feather beside the creek", "A hidden path through the pines", "Fireflies above the mossy stones", "The first snowfall on the ridge", "A quiet lake beneath the moon", "The old oak at the valley's edge", "A distant howl, answered"]
        let item = stories[state.discoveries.count % stories.count]
        state.days[key]!.expedition = item; state.discoveries.append(item); state.bond += 15
        return item
    }

    public mutating func chooseDen(_ den: String, premium: Bool) throws {
        guard den == "Pine forest" || (premium && ["Moonlit lake", "Autumn ridge"].contains(den)) else { throw LupoError.unavailable }
        state.den = den
    }

    private func validate(_ habit: Habit) throws {
        guard !habit.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, habit.title.count <= 80,
              habit.cue.count <= 120, !habit.weekdays.isEmpty, habit.weekdays.isSubset(of: Set(1...7)) else { throw LupoError.invalidGoal }
    }

    public static func decode(_ data: Data, clock: GameClock = GameClock()) throws -> Game {
        let s = try JSONDecoder().decode(Companion.self, from: data)
        guard s.version == 1, clock.date(s.lastDay) != nil, (0...100).contains(s.nourishment), (0...9).contains(s.food), (0...10_000_000).contains(s.bond),
              !s.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, s.name.count <= 24, s.intention.count <= 140,
              s.habits.count <= 3, Set(s.habits.map(\.id)).count == s.habits.count, s.days.count <= 10_000,
              s.discoveries.count <= 10_000, s.discoveries.allSatisfy({ $0.count <= 200 }),
              ["Pine forest", "Moonlit lake", "Autumn ridge"].contains(s.den),
              s.days.keys.allSatisfy({ clock.date($0) != nil && $0 <= s.lastDay }) else { throw LupoError.invalidSave }
        let game = Game(state: s, clock: clock)
        for h in s.habits { try game.validate(h) }
        for day in s.days.values {
            guard day.scheduled.count <= 3, Set(day.scheduled.map(\.id)).count == day.scheduled.count,
                  day.completed.isSubset(of: Set(day.scheduled.map(\.id))), (0...4).contains(day.fed),
                  (0...2880).contains(day.focusMinutes), day.expedition.map({ $0.count <= 200 }) ?? true,
                  !day.rest || (day.completed.isEmpty && day.focusMinutes == 0 && day.expedition == nil) else { throw LupoError.invalidSave }
            for h in day.scheduled { try game.validate(h) }
        }
        if let focus = s.focus {
            guard [5,10,25,50].contains(focus.duration), focus.started.timeIntervalSince1970.isFinite,
                  clock.key(focus.started) <= s.lastDay else { throw LupoError.invalidSave }
        }
        return game
    }
}
