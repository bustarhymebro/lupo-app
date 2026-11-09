import XCTest
import StoreKit
import StoreKitTest

/// Exercises the shipping Membership object through the real app UI and Apple's local store.
/// Run serially: SKTestSession configures a shared store on the selected simulator.
@MainActor
final class LupoStoreKitTests: XCTestCase {
    private var app: XCUIApplication!
    private var session: SKTestSession!
    private let productID = "com.chlebholdings.lupo.plus.lifetime"

    private func prepare() throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "LupoTest", withExtension: "storekit"))
        session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        app = XCUIApplication()
        app.launchEnvironment["LUPO_UI_TEST_SESSION"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        tap(app.buttons["Meet Ash"])
        tap(app.buttons["Make room for this"])
        tap(app.buttons["Share the welcome meal"])
        tap(app.tabBars.buttons["Den"])
        tap(app.buttons["Explore Lupo Plus"])
        assertLocalProduct()
    }

    private func cleanUp() {
        app?.terminate()
        session?.clearTransactions()
        session?.resetToDefaultState()
        app = nil; session = nil
    }

    private func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: 12), "Missing control", file: file, line: line)
        for _ in 0..<8 {
            if element.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Unreachable control", file: file, line: line)
        element.tap()
    }

    private func assertLocalProduct(file: StaticString = #filePath, line: UInt = #line) {
        let purchase = app.buttons["plus.purchase"]
        XCTAssertTrue(purchase.waitForExistence(timeout: 15), "Local product did not load", file: file, line: line)
        // Never tap a product that has fallen through to the production store.
        XCTAssertEqual(purchase.value as? String, "Lupo Plus — Local Test", file: file, line: line)
    }

    private func status(_ message: String, file: StaticString = #filePath, line: UInt = #line) {
        let value = app.staticTexts["plus.status"]
        let expected = NSPredicate(format: "label == %@", message)
        let result = XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: expected, object: value)], timeout: 12)
        XCTAssertEqual(result, .completed, "Expected status: \(message)", file: file, line: line)
    }

    private func unlocked(_ expected: Bool, file: StaticString = #filePath, line: UInt = #line) {
        let element = app.staticTexts["Lupo Plus is unlocked"]
        let result = XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == %@", NSNumber(value: expected)), object: element)], timeout: 12)
        XCTAssertEqual(result, .completed, "Incorrect entitlement state", file: file, line: line)
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    private func statusCleared(file: StaticString = #filePath, line: UInt = #line) {
        let cleared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.staticTexts["plus.status"])
        XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 12), .completed, file: file, line: line)
    }

    func testPurchaseRelaunchRestoreAndRefundPreserveNotes() throws {
        defer { cleanUp() }
        try prepare()
        capture("14-local-store-offer")
        tap(app.buttons["plus.purchase"])
        unlocked(true)
        let transaction = try XCTUnwrap(session.allTransactions().first { $0.productIdentifier == productID })
        XCTAssertEqual(transaction.state, .purchased)
        capture("15-purchase-unlocked")
        tap(app.buttons["screen.close.Lupo Plus"])
        tap(app.tabBars.buttons["Companion"])
        tap(app.buttons["Find a guided trail"])
        tap(app.buttons["trail.start.attention"])
        let note = app.textViews["trail.note"].exists ? app.textViews["trail.note"] : app.textFields["trail.note"]
        tap(note); note.typeText("One quiet page belongs to me")
        tap(app.buttons["keyboard.done"])
        tap(app.buttons["trail.complete"])
        tap(app.buttons["screen.close.Guided trails"])
        app.terminate(); app.launch()
        tap(app.tabBars.buttons["Den"])
        tap(app.buttons["Your Lupo Plus unlock"])
        unlocked(true)
        tap(app.buttons["Restore purchases"])
        status("Plus restored.")
        try session.refundTransaction(identifier: transaction.identifier)
        unlocked(false)
        assertLocalProduct()
        tap(app.buttons["Restore purchases"])
        status("No Lupo Plus purchase was found.")
        capture("16-refund-removes-access")
        tap(app.buttons["screen.close.Lupo Plus"])
        tap(app.tabBars.buttons["Companion"])
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "10 bond")
        tap(app.buttons["Continue your guided trail"])
        let journal = app.buttons["Make room for focus"]
        tap(journal)
        XCTAssertTrue(app.staticTexts["One quiet page belongs to me"].waitForExistence(timeout: 5))
        capture("17-refund-keeps-private-note")
        tap(app.buttons["trail.start.evening"])
        unlocked(false)
        assertLocalProduct()
    }

    func testAskToBuyWaitsForApproval() throws {
        defer { cleanUp() }
        try prepare()
        session.askToBuyEnabled = true
        tap(app.buttons["plus.purchase"])
        status("Your purchase is awaiting approval.")
        unlocked(false)
        let pending = try XCTUnwrap(session.allTransactions().first { $0.pendingAskToBuyConfirmation })
        capture("18-approval-pending")
        try session.approveAskToBuyTransaction(identifier: pending.identifier)
        unlocked(true)
        statusCleared()
        capture("19-approval-unlocks")
    }

    func testPurchaseFailureCancellationAndRetry() async throws {
        defer { cleanUp() }
        try prepare()
        try await session.setSimulatedError(.generic(.unknown), forAPI: .purchase)
        tap(app.buttons["plus.purchase"])
        status("Purchase didn't finish. You haven't lost any progress.")
        unlocked(false)
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        tap(app.buttons["plus.purchase"])
        statusCleared()
        unlocked(false)
        XCTAssertTrue(session.allTransactions().filter { $0.state == .purchased }.isEmpty)
        try await session.setSimulatedError(nil, forAPI: .purchase)
        tap(app.buttons["plus.purchase"])
        unlocked(true)
    }

    func testUnverifiedPurchaseCannotUnlockPlus() async throws {
        defer { cleanUp() }
        try prepare()
        try await session.setSimulatedError(.verification(.invalidSignature), forAPI: .verification)
        tap(app.buttons["plus.purchase"])
        status("This purchase couldn't be verified. Plus was not unlocked.")
        unlocked(false)
        capture("20-unverified-purchase-stays-locked")
    }
}
