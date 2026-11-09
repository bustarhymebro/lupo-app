import SwiftUI
import StoreKit
import UniformTypeIdentifiers
#if DEBUG
import OSLog
#endif

@MainActor
final class LupoStore: ObservableObject {
    @Published private(set) var game: Game
    @Published var message: String?
    @Published private(set) var storageBlocked = false
    @Published private(set) var canUndoGoal = false
    private var undoGoalState: Game?
    private let url: URL
    init() {
        #if os(macOS)
        var directory = URL.applicationSupportDirectory.appending(path: Bundle.main.bundleIdentifier ?? "LupoPreview")
        #else
        var directory = URL.applicationSupportDirectory.appending(path: "Lupo")
        #endif
        #if DEBUG
        // UI tests use a unique save directory and never clear a person's progress.
        if let session = ProcessInfo.processInfo.environment["LUPO_UI_TEST_SESSION"], UUID(uuidString: session) != nil {
            directory = directory.appending(path: "UITests").appending(path: session)
        }
        #endif
        url = directory.appending(path: "companion.json")
        game = Game(state: Companion(day: GameClock().key(Date())))
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: url.path) { game = try Game.decode(Data(contentsOf: url)) }
            apply { try $0.open(at: Date()) }
        } catch {
            storageBlocked = true
            message = "Your saved wolf could not be opened. The original file is preserved. Export it before resetting."
        }
    }
    var state: Companion { game.state }
    var day: Day { state.days[state.lastDay] ?? Day(scheduled: []) }
    func apply(_ change: (inout Game) throws -> Void) {
        guard !storageBlocked else { message = "Export your saved data, then reset to start again."; return }
        do {
            // Re-read the current timezone after travel or a device setting change.
            var candidate = Game(state: game.state)
            try change(&candidate)
            let data = try JSONEncoder().encode(candidate.state)
            try data.write(to: url, options: .atomic)
            undoGoalState = nil; canUndoGoal = false
            game = candidate
            message = nil
        } catch let error as LupoError {
            switch error {
            case .invalidClock: message = "Your clock is earlier than your last visit. Check your device date to continue."
            case .alreadyDone: message = "Already counted. Your progress is safe."
            case .noFood: message = state.nourishment == 100 ? "Full for now. Save this food for later." : "Complete a goal to earn a meal."
            case .resting: message = "A rest day is already set. Your goals return tomorrow."
            default: message = "That action is not available yet."
            }
        } catch { message = "Couldn't save this change. Please free some device storage and try again." }
    }
    func export() -> Data {
        (try? Data(contentsOf: url)) ?? (try? JSONEncoder().encode(state)) ?? Data()
    }
    func completeGoal(_ id: UUID) {
        let previous = game
        apply { try $0.complete(id, at: Date()) }
        if game.state != previous.state { undoGoalState = previous; canUndoGoal = true }
    }
    func undoLastGoal() {
        guard let previous = undoGoalState, previous.state.lastDay == GameClock().key(Date()) else { return }
        do {
            try JSONEncoder().encode(previous.state).write(to: url, options: .atomic)
            game = previous; undoGoalState = nil; canUndoGoal = false
        } catch { message = "Couldn't undo this check-in. Please try again." }
    }
    func reset() {
        // Subscription ownership is separate from local progress.
        do {
            let newGame = Game(state: Companion(day: GameClock().key(Date())))
            try JSONEncoder().encode(newGame.state).write(to: url, options: .atomic)
            storageBlocked = false; game = newGame
            apply { try $0.open(at: Date()) }
        } catch { message = "Couldn't reset your saved data. Please try again." }
    }
    func restoreBackup(_ data: Data) {
        do {
            guard data.count <= 10_000_000 else { throw LupoError.invalidSave }
            var restored = try Game.decode(data)
            try restored.open(at: Date())
            try JSONEncoder().encode(restored.state).write(to: url, options: .atomic)
            storageBlocked = false; game = restored; undoGoalState = nil; canUndoGoal = false; message = nil
        } catch { message = "This backup couldn't be restored. Your existing progress is unchanged." }
    }
}

struct LupoDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: data) }
}

@MainActor
final class Membership: ObservableObject {
    static let productIDs = ["com.chlebholdings.lupo.plus.lifetime"]
    @Published private(set) var products: [Product] = []
    @Published private(set) var active = false
    @Published private(set) var busy = false
    @Published var status: String?
    private var listener: Task<Void, Never>?
    #if DEBUG
    private let logger = Logger(subsystem: "com.chlebholdings.lupo", category: "Store")
    #endif
    private func trace(_ event: String) {
        #if DEBUG
        logger.debug("\(event, privacy: .public)")
        #endif
    }
    private var usesUnavailableTestStore: Bool {
        #if DEBUG
        return ProcessInfo.processInfo.environment["LUPO_UI_TEST_STORE"] == "unavailable"
            && ProcessInfo.processInfo.environment["LUPO_UI_TEST_SESSION"].flatMap(UUID.init(uuidString:)) != nil
        #else
        return false
        #endif
    }
    private let unavailableMessage = "Plus isn't available in this build. Your wolf and daily goals are free."
    init() {
        // General interaction tests isolate store availability. StoreKit tests use real local transactions.
        if usesUnavailableTestStore { status = unavailableMessage; return }
        listener = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result {
                    await self.refresh(); self.status = nil; await transaction.finish()
                }
            }
        }
        Task { await load() }
    }
    deinit { listener?.cancel() }
    func load() async {
        guard !usesUnavailableTestStore else { status = unavailableMessage; return }
        trace("Product lookup started")
        do {
            let loaded = try await Product.products(for: Self.productIDs)
            trace("Product lookup returned")
            products = Self.productIDs.compactMap { id in loaded.first { $0.id == id && $0.type == .nonConsumable } }
            status = products.isEmpty ? unavailableMessage : nil
        } catch { status = "The App Store couldn't be reached. Try again when you're online." }
        await refresh()
    }
    func refresh() async {
        guard !usesUnavailableTestStore else { active = false; return }
        trace("Entitlement lookup started")
        var entitled = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, Self.productIDs.contains(transaction.productID), transaction.revocationDate == nil { entitled = true }
        }
        active = entitled
        trace("Entitlement lookup finished; active=\(entitled)")
    }
    func purchase(_ product: Product, using action: sending PurchaseAction) async {
        guard !usesUnavailableTestStore else { status = unavailableMessage; return }
        guard !busy else { return }; busy = true; status = nil; defer { busy = false }
        trace("PurchaseAction started")
        do {
            // The view's PurchaseAction carries the scene needed for system confirmation UI.
            let result = try await action(product)
            trace("PurchaseAction returned")
            switch result {
            case .success(.verified(let transaction)):
                trace("Verified purchase received")
                await refresh(); await transaction.finish(); status = active ? "Welcome to Lupo Plus." : "Purchase received. Checking your unlock."
            case .success(.unverified): status = "This purchase couldn't be verified. Plus was not unlocked."
            case .pending: status = "Your purchase is awaiting approval."
            case .userCancelled: break
            @unknown default: status = "Purchase status changed. Try restoring purchases."
            }
        } catch StoreKitError.userCancelled { trace("Purchase canceled"); status = nil }
        catch { trace("Purchase failed"); status = "Purchase didn't finish. You haven't lost any progress." }
    }
    func restore() async {
        guard !usesUnavailableTestStore else { status = unavailableMessage; return }
        guard !busy else { return }; busy = true; defer { busy = false }
        trace("Restore started")
        do { try await AppStore.sync(); await refresh(); status = active ? "Plus restored." : "No Lupo Plus purchase was found." }
        catch { status = "Couldn't restore purchases. Please try again." }
    }
}
