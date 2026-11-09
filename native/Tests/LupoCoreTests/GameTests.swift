#if DIRECT_TEST
import Foundation
class XCTestCase {}
func XCTAssertEqual<T: Equatable>(_ lhs: T, _ rhs: T, file: StaticString = #file, line: UInt = #line) {
    precondition(lhs == rhs, "Expected \(rhs), got \(lhs)", file: file, line: line)
}
func XCTAssertThrowsError<T>(_ expression: @autoclosure () throws -> T, file: StaticString = #file, line: UInt = #line) {
    do { _ = try expression() } catch { return }
    preconditionFailure("Expected an error", file: file, line: line)
}
#else
import XCTest
@testable import LupoCore
#endif

final class GameTests: XCTestCase {
    let clock = GameClock(timeZone: TimeZone(identifier: "America/New_York")!)
    func date(_ s: String) -> Date { ISO8601DateFormatter().date(from: s)! }
    var now: Date { date("2026-11-08T17:00:00Z") }
    func adopted() throws -> Game {
        var game = Game(state: Companion(day: clock.key(now)), clock: clock)
        try game.adopt(name: "Ash", intention: "Read more", habits: [Habit(title: "Read 5 pages", cue: "After breakfast")], at: now)
        return game
    }
    func testEditsKeepHistoryAndMissedDaysRemainVisible() throws {
        var g = try adopted()
        let original = g.state.habits[0]
        try g.complete(original.id, at: now)
        var updated = original
        updated.title = "Read one page"
        updated.weekdays = [2, 3]
        try g.editHabit(updated, at: now)
        XCTAssertEqual(g.state.days["2026-11-08"]!.scheduled[0].title, original.title)
        try g.open(at: date("2026-11-11T17:00:00Z"))
        XCTAssertEqual(g.state.days["2026-11-09"]!.scheduled, [updated])
        XCTAssertEqual(g.state.days["2026-11-10"]!.completed.count, 0)
        XCTAssertEqual(g.state.days["2026-11-11"]!.scheduled.count, 0)
        XCTAssertEqual(g.state.days["2026-11-08"]!.completed, [original.id])
    }
    func testFirstFeedAndNoPaidRescue() throws {
        var g = try adopted(); try g.feed(at: now)
        XCTAssertEqual(g.state.nourishment, 100); XCTAssertEqual(g.state.food, 0)
        XCTAssertThrowsError(try g.feed(at: now))
        try g.open(at: date("2026-11-20T17:00:00Z"))
        XCTAssertEqual(g.state.nourishment, 0)
        try g.complete(g.state.habits[0].id, at: date("2026-11-20T17:00:00Z"))
        try g.feed(at: date("2026-11-20T17:00:00Z"))
        XCTAssertEqual(g.state.nourishment, 30)
    }
    func testQuietRemindersRespectCompletionRestAndWeekdays() throws {
        var g = try adopted()
        try g.setReminder(ReminderPreference(hour: 19, minute: 30))
        XCTAssertEqual(ReminderPlanner.plan(state: g.state, now: now, clock: clock).count, 14)
        try g.complete(g.state.habits[0].id, at: now)
        XCTAssertEqual(ReminderPlanner.plan(state: g.state, now: now, clock: clock).count, 13)
        let tomorrow = date("2026-11-09T17:00:00Z")
        try g.rest(at: tomorrow)
        XCTAssertEqual(ReminderPlanner.plan(state: g.state, now: tomorrow, clock: clock).first!.day, "2026-11-10")
        var habit = g.state.habits[0]; habit.weekdays = [2]
        try g.editHabit(habit, at: tomorrow)
        XCTAssertEqual(ReminderPlanner.plan(state: g.state, now: tomorrow, clock: clock).map(\.day), ["2026-11-16"])
        try g.setReminder(nil)
        XCTAssertEqual(ReminderPlanner.plan(state: g.state, now: tomorrow, clock: clock).count, 0)
    }
    func testAfterMidnightReminderBelongsToPreviousGameDay() throws {
        var g = try adopted(); try g.setReminder(ReminderPreference(hour: 1, minute: 0))
        let first = ReminderPlanner.plan(state: g.state, now: now, clock: clock)[0]
        XCTAssertEqual(first.day, "2026-11-08")
        XCTAssertEqual(first.date, date("2026-11-09T06:00:00Z"))
        XCTAssertThrowsError(try g.setReminder(ReminderPreference(hour: 24, minute: 0)))
        var s = g.state; s.reminder = ReminderPreference(hour: 12, minute: 60)
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
    }
    func testWestwardTravelPreservesFutureReminders() throws {
        var g = try adopted(); try g.setReminder(ReminderPreference(hour: 19, minute: 0))
        let travelTime = date("2026-11-09T10:00:00Z")
        try g.open(at: travelTime)
        let west = GameClock(timeZone: TimeZone(identifier: "America/Los_Angeles")!)
        XCTAssertEqual(west.key(travelTime), "2026-11-08")
        let reminders = ReminderPlanner.plan(state: g.state, now: travelTime, clock: west)
        XCTAssertEqual(reminders.count, 14)
        XCTAssertEqual(reminders.first!.day, "2026-11-09")
        XCTAssertEqual(reminders.first!.date, date("2026-11-10T03:00:00Z"))
        var travelled = Game(state: g.state, clock: west)
        XCTAssertThrowsError(try travelled.complete(g.state.habits[0].id, at: travelTime))
        try travelled.complete(g.state.habits[0].id, at: date("2026-11-09T20:00:00Z"))
        XCTAssertEqual(travelled.state.bond, 10)
    }
    func testFreshStartTrailRewardsOnceAndPreservesNotes() throws {
        var g = try adopted()
        try g.beginTrail("fresh-start", premium: false, at: now)
        try g.completeTrailStep(note: "A page after coffee", premium: false, at: now)
        XCTAssertEqual(g.state.food, 2); XCTAssertEqual(g.state.bond, 10)
        XCTAssertThrowsError(try g.completeTrailStep(note: "", premium: false, at: now))
        XCTAssertThrowsError(try g.rest(at: now))
        try g.beginTrail("fresh-start", premium: false, at: now)
        XCTAssertEqual(g.state.pastTrails?.first?.entries.first?.note, "A page after coffee")
        XCTAssertThrowsError(try g.completeTrailStep(note: "", premium: false, at: now))
        try g.completeTrailStep(note: "Back again", premium: false, at: now.addingTimeInterval(86400))
        let restored = try Game.decode(JSONEncoder().encode(g.state), clock: clock)
        XCTAssertEqual(restored.state, g.state)
    }
    func testPremiumTrailRequiresAccessButNotesRemainReadable() throws {
        var g = try adopted()
        XCTAssertThrowsError(try g.beginTrail("attention", premium: false, at: now))
        try g.beginTrail("attention", premium: true, at: now)
        XCTAssertThrowsError(try g.completeTrailStep(note: "", premium: false, at: now))
        try g.completeTrailStep(note: "Five minutes reading", premium: true, at: now)
        let restored = try Game.decode(JSONEncoder().encode(g.state), clock: clock)
        XCTAssertEqual(restored.state.trail?.entries.first?.note, "Five minutes reading")
        try g.open(at: now.addingTimeInterval(86400))
        try g.rest(at: now.addingTimeInterval(86400))
        XCTAssertThrowsError(try g.completeTrailStep(note: "", premium: true, at: now.addingTimeInterval(86400)))
    }
    func testTrailCompletionHasNoDeadlineOrExtraReward() throws {
        var g = try adopted(); try g.beginTrail("fresh-start", premium: false, at: now)
        for index in 0..<7 {
            try g.completeTrailStep(note: "", premium: false, at: now.addingTimeInterval(Double(index * 3 * 86400)))
        }
        XCTAssertEqual(g.state.trail?.isComplete, true)
        XCTAssertEqual(g.state.bond, 70)
        XCTAssertThrowsError(try g.completeTrailStep(note: "", premium: false, at: now.addingTimeInterval(22 * 86400)))
    }
    func testTrailBackupsRejectInvalidAndDuplicateEntries() throws {
        let g = try adopted(); var s = g.state
        s.trail = TrailProgress(id: "missing", started: s.lastDay, entries: [])
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
        s.trailRewardDay = s.lastDay
        s.trail = TrailProgress(id: "fresh-start", started: s.lastDay, entries: [TrailEntry(day: s.lastDay, note: ""), TrailEntry(day: s.lastDay, note: "")])
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
        s.trail = TrailProgress(id: "fresh-start", started: s.lastDay, entries: [TrailEntry(day: s.lastDay, note: String(repeating: "x", count: 281))])
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
    }
    func testOldBackupsWithoutNewOptionsStillRestore() throws {
        let g = try adopted()
        var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(g.state)) as! [String: Any]
        for key in ["reminder", "trail", "trailRewardDay", "pastTrails"] { object.removeValue(forKey: key) }
        let restored = try Game.decode(JSONSerialization.data(withJSONObject: object), clock: clock)
        XCTAssertEqual(restored.state, g.state)
    }
    func testCompletionAndExpeditionIdempotency() throws {
        var g = try adopted(); let id = g.state.habits[0].id
        try g.complete(id, at: now)
        XCTAssertThrowsError(try g.complete(id, at: now))
        _ = try g.explore(at: now)
        XCTAssertThrowsError(try g.explore(at: now))
        XCTAssertEqual(g.state.bond, 25); XCTAssertEqual(g.state.food, 2)
    }
    func testHungerAgesOnceAndGrowthPersists() throws {
        var g = try adopted(); try g.complete(g.state.habits[0].id, at: now)
        let future = date("2027-11-08T17:00:00Z")
        try g.open(at: future); try g.open(at: future)
        XCTAssertEqual(g.state.nourishment, 0); XCTAssertEqual(g.state.bond, 10)
    }
    func testRestProtectsOnlyOneDay() throws {
        var g = try adopted(); try g.rest(at: now)
        XCTAssertThrowsError(try g.complete(g.state.habits[0].id, at: now))
        try g.open(at: date("2026-11-09T17:00:00Z"))
        XCTAssertEqual(g.state.nourishment, 70)
        try g.open(at: date("2026-11-10T17:00:00Z"))
        XCTAssertEqual(g.state.nourishment, 50)
    }
    func testRestCannotEraseCompletedDay() throws {
        var g = try adopted(); try g.complete(g.state.habits[0].id, at: now)
        XCTAssertThrowsError(try g.rest(at: now))
    }
    func testBackwardClockDoesNotReopenRewardDay() throws {
        var g = try adopted(); try g.complete(g.state.habits[0].id, at: now)
        XCTAssertThrowsError(try g.open(at: date("2026-11-07T17:00:00Z")))
        XCTAssertThrowsError(try g.complete(g.state.habits[0].id, at: now))
        XCTAssertEqual(g.state.bond, 10)
    }
    func testCivilDayBoundaryAcrossDaylightSaving() {
        XCTAssertEqual(clock.key(date("2026-11-01T08:59:00Z")), "2026-10-31")
        XCTAssertEqual(clock.key(date("2026-11-01T09:00:00Z")), "2026-11-01")
        XCTAssertEqual(clock.key(date("2026-03-08T07:59:00Z")), "2026-03-07")
        XCTAssertEqual(clock.key(date("2026-03-08T08:00:00Z")), "2026-03-08")
        XCTAssertEqual(clock.distance("2026-03-07", "2026-03-09"), 2)
    }
    func testFocusSurvivesSerializationAndAwardsOnce() throws {
        var g = try adopted(); try g.startFocus(minutes: 5, at: now)
        XCTAssertThrowsError(try g.finishFocus(at: now.addingTimeInterval(299)))
        g = try Game.decode(JSONEncoder().encode(g.state), clock: clock)
        try g.finishFocus(at: now.addingTimeInterval(300))
        XCTAssertEqual(g.state.food, 2)
        XCTAssertThrowsError(try g.finishFocus(at: now.addingTimeInterval(600)))
        try g.startFocus(minutes: 5, at: now.addingTimeInterval(600))
        try g.finishFocus(at: now.addingTimeInterval(900))
        XCTAssertEqual(g.state.food, 2); XCTAssertEqual(g.state.days[clock.key(now)]?.focusMinutes, 10)
    }
    func testNewGoalStartsTomorrowAndCannotFarm() throws {
        var g = try adopted(); let h = Habit(title: "Walk", cue: "After lunch")
        try g.addHabit(h, at: now)
        XCTAssertThrowsError(try g.complete(h.id, at: now))
        let tomorrow = now.addingTimeInterval(86400)
        try g.complete(h.id, at: tomorrow)
        g.removeHabit(h.id)
        XCTAssertThrowsError(try g.complete(h.id, at: tomorrow))
    }
    func testMalformedSaveAndInvalidGoalsRejected() throws {
        var g = try adopted()
        XCTAssertThrowsError(try g.addHabit(Habit(title: "", cue: ""), at: now))
        XCTAssertThrowsError(try Game.decode(Data("{}".utf8)))
        var s = g.state; s.nourishment = -1
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
    }
    func testPremiumDoesNotGateBasicCare() throws {
        var g = try adopted()
        XCTAssertThrowsError(try g.chooseDen("Moonlit lake", premium: false))
        try g.chooseDen("Moonlit lake", premium: true)
        try g.feed(at: now)
        XCTAssertEqual(g.state.den, "Moonlit lake")
    }
    func testBackupCannotInjectOverflowOrInvalidHistory() throws {
        let g = try adopted()
        var s = g.state; s.bond = Int.max
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
        s = g.state; s.focus = FocusSession(started: now, duration: Int.max)
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
        s = g.state; s.days[clock.key(now)]!.focusMinutes = Int.max
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
        s = g.state; s.days[clock.key(now)]!.completed = [UUID()]
        XCTAssertThrowsError(try Game.decode(JSONEncoder().encode(s), clock: clock))
    }
}
