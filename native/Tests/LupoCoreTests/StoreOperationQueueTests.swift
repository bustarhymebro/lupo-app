import XCTest
@testable import LupoCore

@MainActor
final class StoreOperationQueueTests: XCTestCase {
    @MainActor private final class Pause {
        let entered: XCTestExpectation
        private var continuation: CheckedContinuation<Void, Never>?

        init(_ name: String) { entered = XCTestExpectation(description: name) }
        func wait() async {
            await withCheckedContinuation {
                continuation = $0
                entered.fulfill()
            }
        }
        func resume() { continuation?.resume(); continuation = nil }
    }

    func testRestoreWaitsForReceiptReadAndKeepsItsRefreshExclusive() async {
        let queue = StoreOperationQueue()
        let initialRead = Pause("initial receipt read")
        let restoreSync = Pause("restore sync")
        let forbiddenOverlap = XCTestExpectation(description: "overlapping receipt operation")
        forbiddenOverlap.isInverted = true
        var events: [String] = []
        var initialReadFinished = false
        var restoreFinished = false

        let initial = queue.enqueue {
            events.append("initial read started")
            await initialRead.wait()
            initialReadFinished = true
            events.append("initial read finished")
        }
        let restore = queue.enqueue {
            if !initialReadFinished { forbiddenOverlap.fulfill() }
            events.append("restore sync started")
            await restoreSync.wait()
            events.append("restore receipt refreshed")
            restoreFinished = true
        }
        let background = queue.enqueue {
            if !restoreFinished { forbiddenOverlap.fulfill() }
            events.append("background receipt refreshed")
        }

        let firstStarted = await XCTWaiter.fulfillment(of: [initialRead.entered], timeout: 2)
        XCTAssertEqual(firstStarted, .completed)
        let whileReading = await XCTWaiter.fulfillment(of: [forbiddenOverlap], timeout: 0.1)
        XCTAssertEqual(whileReading, .completed)
        XCTAssertEqual(events, ["initial read started"])
        initialRead.resume()

        let restoreStarted = await XCTWaiter.fulfillment(of: [restoreSync.entered], timeout: 2)
        XCTAssertEqual(restoreStarted, .completed)
        XCTAssertEqual(events, ["initial read started", "initial read finished", "restore sync started"])
        restoreSync.resume()
        await initial.value
        await restore.value
        await background.value
        XCTAssertEqual(events, ["initial read started", "initial read finished", "restore sync started", "restore receipt refreshed", "background receipt refreshed"])
    }
}
