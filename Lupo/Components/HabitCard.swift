import SwiftUI

struct HabitCard: View {
    let habit: Habit
    let result: DailyLog.HabitResult?
    let onToggle: (Bool) -> Void
    let onValueChange: ((Double) -> Void)?

    @State private var isPressed = false
    @EnvironmentObject var viewModel: AppViewModel

    private var isCompleted: Bool {
        result?.completed ?? false
    }

    private var isScreenTime: Bool {
        habit.type == .screenTime
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(isCompleted ? Color(hex: "22C55E").opacity(0.15) : Color(hex: "1C1C1C"))
                        .frame(width: 44, height: 44)

                    Image(systemName: habit.type.icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(isCompleted ? Color(hex: "22C55E") : Color(hex: "A0A0A0"))
                }

                // Name + detail
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(habit.type.displayName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)

                        if habit.isRequired {
                            Text("REQUIRED")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .tracking(0.8)
                                .foregroundColor(Color(hex: "F5A623"))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color(hex: "F5A623").opacity(0.12))
                                .cornerRadius(3)
                        }
                    }

                    Text(targetText)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "A0A0A0"))
                }

                Spacer()

                // Checkbox / indicator
                checkboxView
            }
            .padding(16)

            // Screen time note
            if isScreenTime {
                Divider()
                    .background(Color(hex: "2A2A2A"))

                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "A0A0A0"))

                    Text("Tracked automatically via iOS Screen Time")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "A0A0A0"))

                    Spacer()

                    // Manual override toggle when entitlement not available
                    Button(action: {
                        onToggle(!isCompleted)
                    }) {
                        Text(isCompleted ? "Under limit" : "Mark done")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(isCompleted ? Color(hex: "22C55E") : Color(hex: "F5A623"))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            isCompleted ? Color(hex: "22C55E").opacity(0.35) : Color(hex: "2A2A2A"),
                            lineWidth: 1
                        )
                )
        )
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isPressed)
        .onTapGesture {
            guard !isScreenTime else { return }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.65)) {
                onToggle(!isCompleted)
            }
        }
        .onLongPressGesture(minimumDuration: 0, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }

    // MARK: - Sub-views

    @ViewBuilder
    private var checkboxView: some View {
        if isScreenTime {
            // Status dot
            Circle()
                .fill(isCompleted ? Color(hex: "22C55E") : Color(hex: "2A2A2A"))
                .frame(width: 14, height: 14)
                .overlay(Circle().strokeBorder(Color(hex: "3A3A3A"), lineWidth: 1))
        } else {
            Button(action: {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.65)) {
                    onToggle(!isCompleted)
                }
            }) {
                ZStack {
                    Circle()
                        .fill(isCompleted ? Color(hex: "22C55E") : Color.clear)
                        .frame(width: 28, height: 28)
                        .overlay(
                            Circle()
                                .strokeBorder(
                                    isCompleted ? Color(hex: "22C55E") : Color(hex: "3A3A3A"),
                                    lineWidth: 2
                                )
                        )

                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    private var targetText: String {
        let t = habit.target
        let unit = habit.type.unit
        switch habit.type {
        case .screenTime: return "Max \(formatValue(t)) \(unit)"
        case .sleep:      return "Goal: \(formatValue(t)) \(unit)"
        case .workout:    return "Min \(Int(t)) \(unit)"
        case .focus:      return "Goal: \(formatValue(t)) \(unit)"
        }
    }

    private func formatValue(_ v: Double) -> String {
        v == v.rounded() ? "\(Int(v))" : String(format: "%.1f", v)
    }
}
