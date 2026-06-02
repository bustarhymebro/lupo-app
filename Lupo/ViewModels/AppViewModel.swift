import Foundation
import Combine
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {

    // MARK: - Published State

    @Published var pet: Pet = Pet.new(name: "Lupo")
    @Published var habits: [Habit] = Habit.defaultHabits()
    @Published var dailyLogs: [DailyLog] = []
    @Published var todayLog: DailyLog?
    @Published var hasCompletedOnboarding: Bool = false
    @Published var showingStageUp: Bool = false
    @Published var isPremium: Bool = false

    // MARK: - Init

    init() {
        load()
        checkForNewDay()
    }

    // MARK: - Load

    private func load() {
        let persistence = PersistenceManager.shared
        hasCompletedOnboarding = persistence.isOnboardingComplete()

        if let savedPet = persistence.loadPet() {
            pet = savedPet
        }
        if let savedHabits = persistence.loadHabits() {
            habits = savedHabits
        }
        dailyLogs = persistence.loadLogs()

        // Restore today's log if it exists
        todayLog = dailyLogs.first { Calendar.current.isDateInToday($0.date) }
        if todayLog == nil && hasCompletedOnboarding {
            createTodayLog()
        }
    }

    // MARK: - Onboarding

    func completeOnboarding(petName: String, selectedHabits: [HabitType]) {
        // Configure pet
        pet = Pet.new(name: petName.isEmpty ? "Lupo" : petName)

        // Configure habits: screen time always enabled, others based on selection
        habits = Habit.defaultHabits().map { habit in
            var h = habit
            h.isEnabled = habit.type.isRequired || selectedHabits.contains(habit.type)
            return h
        }

        // Create first log
        createTodayLog()

        // Persist
        PersistenceManager.shared.setOnboardingComplete(true)
        save()

        // Schedule daily notification at 8 PM
        NotificationManager.shared.scheduleDaily(hour: 20, minute: 0, mood: pet.mood)

        hasCompletedOnboarding = true
    }

    // MARK: - Today Log

    private func createTodayLog() {
        let log = DailyLog.new(for: Date(), habits: habits)
        todayLog = log
    }

    // MARK: - Habit Completion

    func markHabitComplete(_ habitId: UUID, value: Double? = nil) {
        guard var log = todayLog else { return }
        guard let idx = log.habitResults.firstIndex(where: { $0.habitId == habitId }) else { return }
        log.habitResults[idx].completed = true
        log.habitResults[idx].value = value
        todayLog = log
        save()
        updateMood()
    }

    func markHabitIncomplete(_ habitId: UUID) {
        guard var log = todayLog else { return }
        guard let idx = log.habitResults.firstIndex(where: { $0.habitId == habitId }) else { return }
        log.habitResults[idx].completed = false
        log.habitResults[idx].value = nil
        todayLog = log
        save()
        updateMood()
    }

    // MARK: - New Day Logic

    func checkForNewDay() {
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: Date())
        let lastUpdatedDay = calendar.startOfDay(for: pet.lastUpdated)

        if lastUpdatedDay < todayStart {
            recalculatePetState()
        }
    }

    func recalculatePetState() {
        let calendar = Calendar.current

        // Find yesterday's log
        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: Date())) else { return }
        let yesterdayLog = dailyLogs.first { calendar.isDate($0.date, inSameDayAs: yesterday) }

        // Save today's log before creating new one
        if let current = todayLog {
            var logs = dailyLogs
            logs.removeAll { calendar.isDateInToday($0.date) }
            logs.append(current)
            dailyLogs = logs
        }

        let allRequiredDone = yesterdayLog?.allRequiredCompleted ?? false

        var updatedPet = pet
        updatedPet.totalDaysTracked += 1

        let previousStage = updatedPet.stage

        if allRequiredDone {
            // Successful day
            updatedPet.consistentDays += 1
            updatedPet.missedDaysStreak = 0
            updatedPet.energy = min(1.0, updatedPet.energy + 0.2)

            // Advance stage based on consistent days
            updatedPet.stage = stageFor(consistentDays: updatedPet.consistentDays)

        } else {
            // Missed day
            updatedPet.missedDaysStreak += 1
            updatedPet.consistentDays = max(0, updatedPet.consistentDays - 1)
            updatedPet.energy = max(0.0, updatedPet.energy - 0.15)

            // Regress stage after 3 consecutive misses
            if updatedPet.missedDaysStreak >= 3 {
                if let prev = updatedPet.stage.previous {
                    updatedPet.stage = prev
                    updatedPet.consistentDays = max(0, updatedPet.consistentDays - 3)
                }
            }
        }

        // Recalculate mood from energy
        updatedPet.mood = moodFor(energy: updatedPet.energy)
        updatedPet.lastUpdated = Date()

        // Detect stage advance
        let didAdvance = updatedPet.stage.rawValue > previousStage.rawValue
        pet = updatedPet

        // Save everything
        PersistenceManager.shared.saveLogs(dailyLogs)
        save()

        // Create fresh today log
        createTodayLog()

        // Show stage-up animation
        if didAdvance {
            showingStageUp = true
        }

        // Update notification with new mood
        NotificationManager.shared.updateDailyNotification(mood: pet.mood)
    }

    // MARK: - Helpers

    private func stageFor(consistentDays: Int) -> PetStage {
        // Work backwards from highest stage
        for stage in PetStage.allCases.reversed() {
            if consistentDays >= stage.daysRequired {
                return stage
            }
        }
        return .newbornPup
    }

    private func moodFor(energy: Double) -> PetMood {
        switch energy {
        case 0.75...: return .thriving
        case 0.5..<0.75: return .good
        case 0.35..<0.5: return .neutral
        case 0.2..<0.35: return .disappointed
        default: return .struggling
        }
    }

    private func updateMood() {
        pet.mood = moodFor(energy: pet.energy)
    }

    // MARK: - Update Target

    func updateHabitTarget(habitId: UUID, target: Double) {
        guard let idx = habits.firstIndex(where: { $0.id == habitId }) else { return }
        habits[idx].target = target
        save()
    }

    // MARK: - Computed

    var todayCompletionRate: Double {
        todayLog?.completionRate ?? 0.0
    }

    var streakText: String {
        let days = pet.consistentDays
        if days == 0 { return "0 days" }
        if days == 1 { return "1 day" }
        return "\(days) days"
    }

    var currentStreak: Int {
        pet.consistentDays
    }

    var enabledHabits: [Habit] {
        habits.filter { $0.isEnabled }
    }

    var todayHabitResults: [DailyLog.HabitResult] {
        todayLog?.habitResults ?? []
    }

    var allTodayComplete: Bool {
        todayLog?.allRequiredCompleted ?? false
    }

    // MARK: - Save

    func save() {
        let persistence = PersistenceManager.shared
        persistence.savePet(pet)
        persistence.saveHabits(habits)

        // Include today's log in persisted logs
        var logsToSave = dailyLogs
        if let today = todayLog {
            logsToSave.removeAll { Calendar.current.isDateInToday($0.date) }
            logsToSave.append(today)
        }
        persistence.saveLogs(logsToSave)

        // Update widget data
        persistence.saveWidgetData(
            petName: pet.name,
            stage: pet.stage.rawValue,
            streak: pet.consistentDays,
            mood: pet.mood.rawValue
        )
    }
}
