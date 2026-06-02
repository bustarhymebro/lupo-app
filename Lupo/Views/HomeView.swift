import SwiftUI

struct HomeView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @State private var showingStageUpOverlay: Bool = false

    // Quick-check habit icons (max 4)
    private var quickHabits: [Habit] { Array(viewModel.enabledHabits.prefix(4)) }

    private var dateString: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: Date())
    }

    var body: some View {
        ZStack {
            // Background
            Color(hex: "0A0A0A").ignoresSafeArea()

            // Subtle grid overlay
            GridOverlay()
                .opacity(0.025)
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // ── Top bar ──────────────────────────────────
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(viewModel.pet.name.uppercased())
                                .font(.system(size: 22, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                                .tracking(2)
                            Text(dateString)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "A0A0A0"))
                        }
                        Spacer()
                        StreakBadge(streak: viewModel.currentStreak)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 12)

                    // ── Mood message ─────────────────────────────
                    Text(moodMessage)
                        .font(.system(size: 13, weight: .regular))
                        .italic()
                        .foregroundColor(Color(hex: "A0A0A0"))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 16)
                        .lineSpacing(3)

                    // ── Wolf Art ─────────────────────────────────
                    GeometryReader { geo in
                        PetArtView(
                            stage: viewModel.pet.stage,
                            mood: viewModel.pet.mood,
                            energy: viewModel.pet.energy
                        )
                        .frame(width: geo.size.width, height: geo.size.width * 0.75)
                    }
                    .frame(height: UIScreen.main.bounds.height * 0.32)
                    .padding(.horizontal, 20)

                    // ── Stage badge ───────────────────────────────
                    VStack(spacing: 6) {
                        Text("STAGE \(viewModel.pet.stage.rawValue) · \(viewModel.pet.stage.displayName.uppercased())")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .tracking(2)
                            .foregroundColor(Color(hex: "F5A623"))
                            .padding(.top, 8)

                        Text(viewModel.pet.stage.tagline)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "555555"))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.bottom, 16)

                    // ── Energy bar ────────────────────────────────
                    EnergyBarView(energy: viewModel.pet.energy)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 10)

                    // ── Progress to next stage ────────────────────
                    if let daysLeft = viewModel.pet.daysUntilNextStage, let nextStage = viewModel.pet.stage.next {
                        VStack(spacing: 6) {
                            HStack {
                                Text("PROGRESS TO \(nextStage.displayName.uppercased())")
                                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                    .tracking(1.2)
                                    .foregroundColor(Color(hex: "555555"))
                                Spacer()
                                Text("\(daysLeft) DAYS LEFT")
                                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                    .tracking(1.2)
                                    .foregroundColor(Color(hex: "A0A0A0"))
                            }
                            .padding(.horizontal, 24)

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color(hex: "1C1C1C"))
                                        .frame(height: 3)
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color(hex: "F5A623"))
                                        .frame(width: geo.size.width * viewModel.pet.progressToNextStage, height: 3)
                                        .animation(.easeInOut(duration: 0.6), value: viewModel.pet.progressToNextStage)
                                }
                            }
                            .frame(height: 3)
                            .padding(.horizontal, 24)
                        }
                        .padding(.bottom, 20)
                    } else {
                        // Adult wolf
                        Text("MAX STAGE REACHED")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .tracking(2)
                            .foregroundColor(Color(hex: "F5A623"))
                            .padding(.bottom, 20)
                    }

                    // ── Today's habit quick-check ─────────────────
                    HabitQuickRow(
                        habits: quickHabits,
                        results: viewModel.todayHabitResults
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 16)

                    // ── CTA ───────────────────────────────────────
                    if viewModel.allTodayComplete {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Color(hex: "F5A623"))
                            Text("All done for today. Lupo is proud.")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "F5A623"))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color(hex: "F5A623").opacity(0.08))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .strokeBorder(Color(hex: "F5A623").opacity(0.2), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal, 20)
                    } else {
                        NavigationLink(destination: EmptyView()) {
                            // Handled by TabView switching — use a visual button
                        }
                        .hidden()

                        Button(action: {
                            // Post notification to switch to habits tab
                            NotificationCenter.default.post(name: Notification.Name("switchToHabitsTab"), object: nil)
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "plus.circle.fill")
                                Text("LOG TODAY")
                                    .tracking(1.5)
                            }
                            .font(.system(size: 15, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(hex: "0A0A0A"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color(hex: "F5A623"))
                            .cornerRadius(14)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                    }

                    Spacer(minLength: 40)
                }
            }

            // ── Stage Up Overlay ─────────────────────────────────
            if viewModel.showingStageUp {
                StageUpOverlay(stage: viewModel.pet.stage) {
                    viewModel.showingStageUp = false
                }
            }
        }
    }

    private var moodMessage: String {
        viewModel.pet.stage.moodMessages[viewModel.pet.mood]
            ?? viewModel.pet.mood.wolfMessage
    }
}

// MARK: - HabitQuickRow

private struct HabitQuickRow: View {
    let habits: [Habit]
    let results: [DailyLog.HabitResult]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(habits) { habit in
                let result = results.first { $0.habitId == habit.id }
                let done = result?.completed ?? false

                VStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .fill(done ? Color(hex: "22C55E").opacity(0.15) : Color(hex: "1C1C1C"))
                            .frame(width: 44, height: 44)
                            .overlay(Circle().strokeBorder(done ? Color(hex: "22C55E").opacity(0.4) : Color(hex: "2A2A2A"), lineWidth: 1))

                        Image(systemName: habit.type.icon)
                            .font(.system(size: 17))
                            .foregroundColor(done ? Color(hex: "22C55E") : Color(hex: "555555"))
                    }

                    Circle()
                        .fill(done ? Color(hex: "F5A623") : Color(hex: "2A2A2A"))
                        .frame(width: 5, height: 5)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
        )
    }
}

// MARK: - GridOverlay

private struct GridOverlay: View {
    var body: some View {
        Canvas { context, size in
            let spacing: CGFloat = 40
            var path = Path()

            var x: CGFloat = 0
            while x <= size.width {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                x += spacing
            }

            var y: CGFloat = 0
            while y <= size.height {
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                y += spacing
            }

            context.stroke(path, with: .color(.white), lineWidth: 0.5)
        }
    }
}

// MARK: - StageUpOverlay

struct StageUpOverlay: View {
    let stage: PetStage
    let onDismiss: () -> Void

    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").opacity(0.96).ignoresSafeArea()

            VStack(spacing: 24) {
                Text("STAGE UP")
                    .font(.system(size: 42, weight: .black, design: .monospaced))
                    .tracking(6)
                    .foregroundColor(Color(hex: "F5A623"))

                PetArtView(stage: stage, mood: .thriving, energy: 1.0)
                    .frame(width: 220, height: 220)
                    .scaleEffect(scale)

                VStack(spacing: 8) {
                    Text(stage.displayName.uppercased())
                        .font(.system(size: 20, weight: .bold, design: .monospaced))
                        .tracking(3)
                        .foregroundColor(.white)

                    Text(stage.tagline)
                        .font(.system(size: 13))
                        .italic()
                        .foregroundColor(Color(hex: "A0A0A0"))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }

                Button(action: onDismiss) {
                    Text("CONTINUE")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .tracking(2)
                        .foregroundColor(Color(hex: "0A0A0A"))
                        .frame(width: 160, height: 48)
                        .background(Color(hex: "F5A623"))
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
        }
        .opacity(opacity)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                scale = 1.0
                opacity = 1.0
            }
        }
        .onTapGesture { onDismiss() }
    }
}
