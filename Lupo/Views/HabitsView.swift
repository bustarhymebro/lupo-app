import SwiftUI

struct HabitsView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @State private var showSuccessBanner = false

    private var dateString: String {
        let f = DateFormatter()
        f.dateFormat = "MMMM d, yyyy"
        return f.string(from: Date())
    }

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {

                    // ── Header ──────────────────────────────────
                    VStack(alignment: .leading, spacing: 4) {
                        Text("TODAY")
                            .font(.system(size: 32, weight: .black, design: .monospaced))
                            .tracking(3)
                            .foregroundColor(.white)

                        Text(dateString.uppercased())
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .tracking(1.5)
                            .foregroundColor(Color(hex: "A0A0A0"))
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 20)

                    // ── Success banner ───────────────────────────
                    if showSuccessBanner {
                        HStack(spacing: 10) {
                            Text("🐺")
                                .font(.system(size: 18))
                            Text("Lupo fed for today")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "22C55E"))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                        .background(Color(hex: "22C55E").opacity(0.1))
                        .overlay(
                            Rectangle()
                                .fill(Color(hex: "22C55E"))
                                .frame(width: 3)
                                .frame(maxHeight: .infinity),
                            alignment: .leading
                        )
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // ── Habit cards ──────────────────────────────
                    VStack(spacing: 10) {
                        ForEach(viewModel.enabledHabits) { habit in
                            let result = viewModel.todayHabitResults.first { $0.habitId == habit.id }

                            HabitCard(
                                habit: habit,
                                result: result,
                                onToggle: { completed in
                                    if completed {
                                        viewModel.markHabitComplete(habit.id, value: nil)
                                    } else {
                                        viewModel.markHabitIncomplete(habit.id)
                                    }
                                    checkForCompletion()
                                },
                                onValueChange: { value in
                                    viewModel.updateHabitTarget(habitId: habit.id, target: value)
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 20)

                    // ── Screen Time note ─────────────────────────
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "iphone")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "A0A0A0"))
                            Text("SCREEN TIME")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .tracking(1.5)
                                .foregroundColor(Color(hex: "A0A0A0"))
                        }

                        Text("Screen time is tracked automatically via iOS — make sure you've granted permission in Settings > Screen Time. If the Family Controls entitlement is pending, use the manual toggle.")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "555555"))
                            .lineSpacing(4)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: "141414"))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 20)

                    // ── Completion summary ───────────────────────
                    let rate = viewModel.todayCompletionRate
                    VStack(spacing: 12) {
                        HStack {
                            Text("TODAY'S COMPLETION")
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .tracking(1.5)
                                .foregroundColor(Color(hex: "555555"))
                            Spacer()
                            Text("\(Int(rate * 100))%")
                                .font(.system(size: 14, weight: .bold, design: .monospaced))
                                .foregroundColor(rate == 1.0 ? Color(hex: "22C55E") : Color(hex: "F5A623"))
                        }

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color(hex: "1C1C1C"))
                                    .frame(height: 5)
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(rate == 1.0 ? Color(hex: "22C55E") : Color(hex: "F5A623"))
                                    .frame(width: geo.size.width * CGFloat(rate), height: 5)
                                    .animation(.easeInOut(duration: 0.5), value: rate)
                            }
                        }
                        .frame(height: 5)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: "141414"))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
                    )
                    .padding(.horizontal, 20)
                    .padding(.top, 12)

                    // ── Save button ──────────────────────────────
                    Button(action: {
                        viewModel.save()
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showSuccessBanner = viewModel.allTodayComplete
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                            Text("SAVE PROGRESS")
                                .tracking(1.5)
                        }
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "0A0A0A"))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(hex: "F5A623"))
                        .cornerRadius(14)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 40)
                }
            }
        }
        .onChange(of: viewModel.allTodayComplete) { allDone in
            if allDone {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    showSuccessBanner = true
                }
            }
        }
    }

    private func checkForCompletion() {
        if viewModel.allTodayComplete {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                showSuccessBanner = true
            }
        }
    }
}
