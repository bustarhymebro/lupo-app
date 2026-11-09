import XCTest

@MainActor
final class LupoUITests: XCTestCase {
    private var app: XCUIApplication!

    private func prepare() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["LUPO_UI_TEST_SESSION"] = UUID().uuidString
        app.launchEnvironment["LUPO_UI_TEST_STORE"] = "unavailable"
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
    }

    private func reveal(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: 8), "Missing control: \(element)", file: file, line: line)
        for _ in 0..<8 {
            if element.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Control cannot be reached", file: file, line: line)
    }

    private func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        reveal(element, file: file, line: line)
        element.tap()
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func adopt() {
        app.launch()
        capture("01-welcome")
        tap(app.buttons["Meet Ash"])
        capture("02-first-goal")
        tap(app.buttons["Make room for this"])
        capture("03-welcome-meal")
        tap(app.buttons["Share the welcome meal"])
        XCTAssertTrue(app.tabBars.buttons["Companion"].waitForExistence(timeout: 5))
        capture("04-companion-start")
    }

    func testGoalUndoExplorationAndPersistence() {
        prepare(); adopt()
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "0 bond")
        let goal = app.buttons["goal.complete.Read 5 pages"]
        XCTAssertTrue(goal.isHittable, "The daily action must be reachable without scrolling")
        tap(goal)
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "10 bond")
        tap(app.buttons["Undo last check-in"])
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "0 bond")
        tap(goal)
        tap(app.buttons["Explore together"])
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "25 bond")
        capture("04-companion-after-exploration")
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["companion.bond"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "25 bond")
        XCTAssertFalse(app.buttons["Explore together"].exists)
        tap(app.tabBars.buttons["Journey"])
        XCTAssertTrue(app.staticTexts["A silver feather beside the creek"].exists || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "A silver feather beside the creek")).firstMatch.exists)
        capture("05-weekly-review")
    }

    func testEditingKeepsTodaySnapshot() {
        prepare(); adopt()
        tap(app.tabBars.buttons["Today"])
        tap(app.buttons["goal.edit.Read 5 pages"])
        let title = app.textFields["goal.title"]
        tap(title)
        let value = title.value as? String ?? ""
        title.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: value.count) + "Read one page")
        tap(app.buttons["keyboard.done"])
        tap(app.buttons["Save my changes"])
        XCTAssertTrue(app.buttons["goal.edit.Read one page"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["goal.complete.Read 5 pages"].exists)
        capture("06-edit-starts-tomorrow")
    }

    func testGuidedTrailNotesAndPurchaseExit() {
        prepare(); adopt()
        tap(app.buttons["Find a guided trail"])
        tap(app.buttons["trail.start.fresh-start"])
        let note = app.textViews["trail.note"].exists ? app.textViews["trail.note"] : app.textFields["trail.note"]
        tap(note); note.typeText("A page after breakfast")
        capture("07-trail-keyboard")
        tap(app.buttons["keyboard.done"])
        tap(app.buttons["trail.complete"])
        XCTAssertFalse(app.buttons["trail.complete"].exists)
        tap(app.buttons["trail.start.attention"])
        XCTAssertTrue(app.buttons["Restore purchases"].waitForExistence(timeout: 5))
        capture("07-plus-offer")
        tap(app.buttons["screen.close.Lupo Plus"])
        XCTAssertTrue(app.buttons["trail.start.fresh-start"].waitForExistence(timeout: 5))
        tap(app.buttons["screen.close.Guided trails"])
        app.terminate(); app.launch()
        tap(app.buttons["Continue your guided trail"])
        XCTAssertFalse(app.buttons["trail.complete"].exists)
        tap(app.buttons["A softer fresh start"])
        XCTAssertTrue(app.staticTexts["A page after breakfast"].waitForExistence(timeout: 5))
        capture("08-trail-after-relaunch")
    }

    func testLargestTextKeepsPrimaryActionReachable() {
        prepare()
        app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        adopt()
        let goal = app.buttons["goal.complete.Read 5 pages"]
        XCTAssertTrue(goal.isHittable, "The daily action must remain reachable at the largest text size")
        reveal(goal)
        capture("09-accessibility-goal")
        tap(goal)
        XCTAssertTrue(app.buttons["Undo last check-in"].exists)
        capture("09-accessibility-text")
    }

    func testSecondaryScreensRemainDismissible() {
        prepare(); adopt()
        tap(app.buttons["Make room for a little focus"])
        capture("10-focus")
        tap(app.buttons["screen.close.Focus"])
        tap(app.tabBars.buttons["Den"])
        tap(app.buttons["den.select.Pine forest"])
        capture("11-den")
        tap(app.buttons["Settings & your data"])
        capture("12-settings")
        tap(app.buttons["Reminder settings"])
        capture("13-reminders")
        tap(app.buttons["screen.close.Reminders"])
        tap(app.buttons["screen.close.Settings"])
        XCTAssertTrue(app.buttons["Settings & your data"].waitForExistence(timeout: 5))
    }

    func testPaidSceneryCanBePreviewedWithoutChangingTheFreeDen() {
        prepare(); adopt()
        tap(app.tabBars.buttons["Den"])
        for den in ["Moonlit lake", "Autumn ridge"] {
            tap(app.buttons["den.select.\(den)"])
            let title = app.staticTexts["den.preview.name"]
            XCTAssertTrue(title.waitForExistence(timeout: 5))
            XCTAssertEqual(title.label, den)
            XCTAssertFalse(app.buttons["den.preview.choose"].exists)
            capture("14-preview-\(den)")
            tap(app.buttons["den.preview.offer"])
            XCTAssertTrue(app.buttons["Restore purchases"].waitForExistence(timeout: 5))
            tap(app.buttons["screen.close.Lupo Plus"])
            XCTAssertTrue(title.waitForExistence(timeout: 5))
            tap(app.buttons["screen.close.Den preview"])
            XCTAssertTrue(app.buttons["den.select.Pine forest"].isSelected)
            XCTAssertFalse(app.buttons["den.select.\(den)"].isSelected)
        }
    }
}
