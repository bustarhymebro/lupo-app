import SwiftUI

struct StatsView: View {
    @EnvironmentObject var viewModel: AppViewModel

    private var last14Logs: [DailyLog?] {
        let calendar = Calendar.current
        return (0..<14).reversed().map { offset -> DailyLog? in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: calendar.startOfDay(for: Date())) else { return nil }
            return viewModel.dailyLogs.first { calendar.isDate($0.date, inSameDayAs: date) }
        }
    }

    private var last7Days: [(String, [DailyLog.HabitResult])] {
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return (0..<7).reversed().map { offset -> (String, [DailyLog.HabitResult]) in
            guard let date = calendar.date(byAdding: .day, value: -offset, to: calendar.startOfDay(for: Date())) else {
                return ("?", [])
            }
            let log = viewModel.dailyLogs.first { calendar.isDate($0.date, inSameDayAs: date) }
            return (formatter.string(from: date).uppercased(), log?.habitResults ?? [])
        }
    }

    private var overallCompletionRate: Double {
        let logs = viewModel.dailyLogs.filter { !$0.isToday }
        guard !logs.isEmpty else { return 0 }
        return logs.map { $0.completionRate }.reduce(0, +) / Double(logs.count)
    }

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {

                    // ── Header ──────────────────────────────────
                    Text("STATS")
                        .font(.system(size: 32, weight: .black, design: .monospaced))
                        .tracking(3)
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 20)

                    // ── 2x2 Stat Grid ────────────────────────────
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StatCard(label: "TOTAL DAYS", value: "\(viewModel.pet.totalDaysTracked)", icon: "calendar")
                        StatCard(label: "STREAK", value: "\(viewModel.currentStreak)", icon: "flame.fill", valueColor: Color(hex: "F5A623"))
                        StatCard(label: "STAGE", value: "\(viewModel.pet.stage.rawValue)", subtitle: viewModel.pet.stage.displayName.uppercased(), icon: "star.fill", valueColor: Color(hex: "F5A623"))
                        StatCard(label: "COMPLETION", value: "\(Int(overallCompletionRate * 100))%", icon: "checkmark.circle.fill", valueColor: overallCompletionRate > 0.7 ? Color(hex: "22C55E") : Color(hex: "F5A623"))
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 28)

                    // ── Growth Journey ────────────────────────────
                    SectionHeader(title: "GROWTH JOURNEY")

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 0) {
                            ForEach(PetStage.allCases, id: \.rawValue) { stage in
                                GrowthStageCell(
                                    stage: stage,
                                    isCurrent: stage == viewModel.pet.stage,
                                    isAchieved: stage.rawValue <= viewModel.pet.stage.rawValue
                                )

                                if stage != .adultWolf {
                                    Rectangle()
                                        .fill(stage.rawValue < viewModel.pet.stage.rawValue ? Color(hex: "F5A623") : Color(hex: "2A2A2A"))
                                        .frame(height: 2)
                                        .frame(maxWidth: .infinity)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .frame(height: 110)
                    .padding(.bottom, 28)

                    // ── 14-day Heatmap ────────────────────────────
                    SectionHeader(title: "RECENT 14 DAYS")

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Array(last14Logs.enumerated()), id: \.offset) { _, log in
                                HeatmapCell(log: log)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 28)

                    // ── This Week breakdown ───────────────────────
                    SectionHeader(title: "THIS WEEK")

                    VStack(spacing: 8) {
                        ForEach(Array(last7Days.enumerated()), id: \.offset) { _, day in
                            WeekDayRow(
                                dayLabel: day.0,
                                results: day.1,
                                enabledHabits: viewModel.enabledHabits
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                }
            }
        }
    }
}

// MARK: - StatCard

private struct StatCard: View {
    let label: String
    let value: String
    var subtitle: String? = nil
    let icon: String
    var valueColor: Color = .white

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "A0A0A0"))
                Text(label)
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .tracking(1.2)
                    .foregroundColor(Color(hex: "A0A0A0"))
            }

            Text(value)
                .font(.system(size: 34, weight: .black, design: .monospaced))
                .foregroundColor(valueColor)

            if let sub = subtitle {
                Text(sub)
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .tracking(1)
                    .foregroundColor(Color(hex: "555555"))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
        )
    }
}

// MARK: - GrowthStageCell

private struct GrowthStageCell: View {
    let stage: PetStage
    let isCurrent: Bool
    let isAchieved: Bool

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(isCurrent ? Color(hex: "F5A623").opacity(0.15) : (isAchieved ? Color(hex: "1C1C1C") : Color(hex: "141414")))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Circle().strokeBorder(
                            isCurrent ? Color(hex: "F5A623") : (isAchieved ? Color(hex: "3A3A3A") : Color(hex: "2A2A2A")),
                            lineWidth: isCurrent ? 2 : 1
                        )
                    )

                PetArtView(stage: stage, mood: .neutral, energy: 0.5, animated: false)
                    .frame(width: 40, height: 40)
                    .opacity(isAchieved ? 1.0 : 0.3)
            }

            Text(stage.displayName.uppercased()
                .components(separatedBy: " ")
                .first ?? "")
                .font(.system(size: 8, weight: isCurrent ? .bold : .regular, design: .monospaced))
                .tracking(0.8)
                .foregroundColor(isCurrent ? Color(hex: "F5A623") : (isAchieved ? Color(hex: "A0A0A0") : Color(hex: "3A3A3A")))
        }
        .frame(width: 72)
    }
}

// MARK: - HeatmapCell

private struct HeatmapCell: View {
    let log: DailyLog?

    private var cellColor: Color {
        guard let log = log else { return Color(hex: "1C1C1C") }
        if log.allRequiredCompleted { return Color(hex: "22C55E").opacity(0.7) }
        if log.completionRate > 0 { return Color(hex: "F5A623").opacity(0.6) }
        return Color(hex: "EF4444").opacity(0.5)
    }

    var body: some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 4)
                .fill(cellColor)
                .frame(width: 18, height: 24)

            if let log = log {
                Text(dayLabel(log.date))
                    .font(.system(size: 7, design: .monospaced))
                    .foregroundColor(Color(hex: "555555"))
            }
        }
    }

    private func dayLabel(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f.string(from: date)
    }
}

// MARK: - WeekDayRow

private struct WeekDayRow: View {
    let dayLabel: String
    let results: [DailyLog.HabitResult]
    let enabledHabits: [Habit]

    private var allDone: Bool {
        let required = results.filter { $0.isRequired }
        return !required.isEmpty && required.allSatisfy { $0.completed }
    }

    var body: some View {
        HStack(spacing: 12) {
            Text(dayLabel)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(Color(hex: "A0A0A0"))
                .frame(width: 30)

            if results.isEmpty {
                Text("—  no data")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "3A3A3A"))
            } else {
                HStack(spacing: 8) {
                    ForEach(enabledHabits) { habit in
                        let result = results.first { $0.habitId == habit.id }
                        let done = result?.completed ?? false

                        Circle()
                            .fill(done ? Color(hex: "22C55E") : Color(hex: "2A2A2A"))
                            .frame(width: 8, height: 8)
                    }
                }

                Spacer()

                Image(systemName: allDone ? "checkmark.circle.fill" : "xmark.circle")
                    .font(.system(size: 14))
                    .foregroundColor(allDone ? Color(hex: "22C55E") : Color(hex: "EF4444").opacity(0.6))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(hex: "141414"))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
        )
    }
}

// MARK: - SectionHeader

private struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .bold, design: .monospaced))
            .tracking(2)
            .foregroundColor(Color(hex: "555555"))
            .padding(.horizontal, 20)
            .padding(.bottom, 10)
    }
}
