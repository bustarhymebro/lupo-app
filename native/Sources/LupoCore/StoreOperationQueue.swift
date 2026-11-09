/// Keeps receipt reads and manual receipt synchronization from overlapping.
/// Main-actor isolation alone does not provide this ordering across suspension.
@MainActor
public final class StoreOperationQueue {
    private var tail: Task<Void, Never>?

    public init() {}

    /// Each operation finishes, including its asynchronous work, before the next starts.
    /// Callers handle errors within the operation so a failed request releases the queue.
    public func enqueue(_ operation: @escaping @MainActor () async -> Void) -> Task<Void, Never> {
        let previous = tail
        let next = Task { @MainActor in
            await previous?.value
            await operation()
        }
        tail = next
        return next
    }
}
