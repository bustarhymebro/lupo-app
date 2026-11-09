import XCTest
import StoreKit
import StoreKitTest

/// Exercises the shipping Membership object through the real app UI and Apple's local store.
/// Run serially: SKTestSession configures a shared store on the selected simulator.
@MainActor
final class LupoStoreKitTests: XCTestCase {
    private enum CheckFailure: Error { case failed }
    private var app: XCUIApplication!
    private var session: SKTestSession!
    private let productID = "com.chlebholdings.lupo.plus.lifetime"

    private func prepare(askToBuy: Bool = false) throws {
        continueAfterFailure = false
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "LupoTest", withExtension: "storekit"))
        session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        session.askToBuyEnabled = askToBuy
        XCTAssertTrue(session.disableDialogs)
        XCTAssertEqual(session.askToBuyEnabled, askToBuy)
        app = XCUIApplication()
        app.launchEnvironment["LUPO_UI_TEST_SESSION"] = UUID().uuidString
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        try tap(app.buttons["Meet Ash"])
        try tap(app.buttons["Make room for this"])
        try tap(app.buttons["Share the welcome meal"])
        try tap(app.tabBars.buttons["Den"])
        try tap(app.buttons["Explore Lupo Plus"])
        try assertLocalProduct()
    }

    private func cleanUp() {
        app?.terminate()
        session?.clearTransactions()
        session?.resetToDefaultState()
        app = nil; session = nil
    }

    private func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) throws {
        guard element.waitForExistence(timeout: 12) else {
            XCTFail("Missing control", file: file, line: line); throw CheckFailure.failed
        }
        for _ in 0..<8 {
            if element.isHittable { break }
            if element.frame.midY < app.frame.midY { app.swipeDown() }
            else { app.swipeUp() }
        }
        guard element.isHittable else {
            XCTFail("Unreachable control", file: file, line: line); throw CheckFailure.failed
        }
        element.tap()
    }

    private func assertLocalProduct(file: StaticString = #filePath, line: UInt = #line) throws {
        let purchase = app.buttons["plus.purchase"]
        guard purchase.waitForExistence(timeout: 15) else {
            XCTFail("Local product did not load", file: file, line: line); throw CheckFailure.failed
        }
        // Never tap a product that has fallen through to the production store.
        guard purchase.value as? String == "Lupo Plus — Local Test" else {
            XCTFail("Refusing to buy a product outside the local test store", file: file, line: line)
            throw CheckFailure.failed
        }
    }

    private func status(_ message: String, file: StaticString = #filePath, line: UInt = #line) async throws {
        let value = app.staticTexts["plus.status"]
        let expected = NSPredicate(format: "label == %@", message)
        let result = await XCTWaiter.fulfillment(of: [XCTNSPredicateExpectation(predicate: expected, object: value)], timeout: 12)
        guard result == .completed else {
            capture("store-status-failure")
            let observed = value.exists ? value.label : "No status text"
            XCTFail("Expected: \(message). Observed: \(observed). \(transactionsDescription). UI: \(app.debugDescription)", file: file, line: line)
            throw CheckFailure.failed
        }
    }

    private func unlocked(_ expected: Bool, file: StaticString = #filePath, line: UInt = #line) async throws {
        let element = app.staticTexts["Lupo Plus is unlocked"]
        let result = await XCTWaiter.fulfillment(of: [XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == %@", NSNumber(value: expected)), object: element)], timeout: 12)
        guard result == .completed else {
            capture("store-entitlement-failure")
            XCTFail("Incorrect entitlement state. \(transactionsDescription). UI: \(app.debugDescription)", file: file, line: line)
            throw CheckFailure.failed
        }
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    private var transactionsDescription: String {
        let records = session.allTransactions().map {
            "id=\($0.identifier), product=\($0.productIdentifier), state=\($0.state.rawValue), pendingApproval=\($0.pendingAskToBuyConfirmation)"
        }
        return "Local store: dialogsDisabled=\(session.disableDialogs), askToBuy=\(session.askToBuyEnabled), transactions=[\(records.joined(separator: "; "))]"
    }

    private func statusCleared(file: StaticString = #filePath, line: UInt = #line) async throws {
        let cleared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.staticTexts["plus.status"])
        guard await XCTWaiter.fulfillment(of: [cleared], timeout: 12) == .completed else {
            XCTFail("Status was not cleared", file: file, line: line); throw CheckFailure.failed
        }
    }

    func testPurchaseRelaunchRestoreAndRefundPreserveNotes() async throws {
        defer { cleanUp() }
        try prepare()
        capture("14-local-store-offer")
        try tap(app.buttons["plus.purchase"])
        try await unlocked(true)
        let transaction = try XCTUnwrap(session.allTransactions().first { $0.productIdentifier == productID })
        XCTAssertEqual(transaction.state, .purchased)
        capture("15-purchase-unlocked")
        try tap(app.buttons["screen.close.Lupo Plus"])
        try tap(app.tabBars.buttons["Companion"])
        try tap(app.buttons["Find a guided trail"])
        try tap(app.buttons["trail.start.attention"])
        let note = app.textViews["trail.note"].exists ? app.textViews["trail.note"] : app.textFields["trail.note"]
        XCTAssertTrue(note.isHittable, "Starting a trail should reveal its first step")
        capture("15-paid-trail-first-step")
        try tap(note); note.typeText("One quiet page belongs to me")
        try tap(app.buttons["keyboard.done"])
        try tap(app.buttons["trail.complete"])
        try tap(app.buttons["screen.close.Guided trails"])
        app.terminate(); app.launch()
        try tap(app.tabBars.buttons["Den"])
        try tap(app.buttons["Your Lupo Plus unlock"])
        try await unlocked(true)
        try tap(app.buttons["Restore purchases"])
        try await status("Plus restored.")
        try session.refundTransaction(identifier: transaction.identifier)
        try await unlocked(false)
        try assertLocalProduct()
        try tap(app.buttons["Restore purchases"])
        try await status("No Lupo Plus purchase was found.")
        capture("16-refund-removes-access")
        try tap(app.buttons["screen.close.Lupo Plus"])
        try tap(app.tabBars.buttons["Companion"])
        XCTAssertEqual(app.staticTexts["companion.bond"].label, "10 bond")
        try tap(app.buttons["Continue your guided trail"])
        try tap(app.buttons["trail.start.evening"])
        try await unlocked(false)
        try assertLocalProduct()
        try tap(app.buttons["screen.close.Lupo Plus"])
        let journal = app.buttons["Make room for focus"]
        try tap(journal)
        XCTAssertTrue(app.staticTexts["One quiet page belongs to me"].waitForExistence(timeout: 5))
        capture("17-refund-keeps-private-note")
    }

    func testAskToBuyWaitsForApproval() async throws {
        defer { cleanUp() }
        try prepare(askToBuy: true)
        try tap(app.buttons["plus.purchase"])
        try await status("Your purchase is awaiting approval.")
        try await unlocked(false)
        let pending = try XCTUnwrap(session.allTransactions().first { $0.pendingAskToBuyConfirmation })
        capture("18-approval-pending")
        try session.approveAskToBuyTransaction(identifier: pending.identifier)
        try await unlocked(true)
        try await statusCleared()
        capture("19-approval-unlocks")
    }

    func testPurchaseFailureCancellationAndRetry() async throws {
        defer { cleanUp() }
        try prepare()
        try await session.setSimulatedError(.generic(.unknown), forAPI: .purchase)
        try tap(app.buttons["plus.purchase"])
        try await status("Purchase didn't finish. You haven't lost any progress.")
        try await unlocked(false)
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        try tap(app.buttons["plus.purchase"])
        try await statusCleared()
        try await unlocked(false)
        XCTAssertTrue(session.allTransactions().filter { $0.state == .purchased }.isEmpty)
        try await session.setSimulatedError(nil, forAPI: .purchase)
        session.disableDialogs = true
        try tap(app.buttons["plus.purchase"])
        try await unlocked(true)
    }

    func testUnverifiedPurchaseCannotUnlockPlus() async throws {
        defer { cleanUp() }
        try prepare()
        try await session.setSimulatedError(.verification(.invalidSignature), forAPI: .verification)
        try tap(app.buttons["plus.purchase"])
        try await status("This purchase couldn't be verified. Plus was not unlocked.")
        try await unlocked(false)
        capture("20-unverified-purchase-stays-locked")
    }
}
