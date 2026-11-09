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
