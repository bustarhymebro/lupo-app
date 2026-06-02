import SwiftUI

struct ChooseHabitsPage: View {
    @Binding var selectedHabits: [HabitType]
    @Binding var screenTimeLimit: Double

    // Limits for optional habits
    @State private var sleepTarget: Double = HabitType.sleep.defaultTarget
    @State private var workoutTarget: Double = HabitType.workout.defaultTarget
    @State private var focusTarget: Double = HabitType.focus.defaultTarget

    private let optionalHabits: [HabitType] = [.sleep, .workout, .focus]
    private let maxOptional = 3

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Header
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Choose your\nhabits.")
                            .font(.system(size: 34, weight: .black))
                            .foregroundColor(.white)
                            .padding(.bottom, 4)

                        Text("Screen time limit is required.\nAdd up to 3 more.")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "A0A0A0"))
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 24)

                    // Screen Time card (required, always selected)
                    RequiredHabitCard(
                        habitType: .screenTime,
                        limit: $screenTimeLimit
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)

                    // Optional habit cards
                    ForEach(optionalHabits, id: \.rawValue) { habitType in
                        let isSelected = selectedHabits.contains(habitType)
                        let canSelect = isSelected || selectedHabits.count < maxOptional

                        OptionalHabitCard(
                            habitType: habitType,
                            isSelected: isSelected,
                            canSelect: canSelect,
                            target: bindingForTarget(habitType)
                        ) {
                            toggleHabit(habitType)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 10)
                    }

                    // Helper text
                    Text("\(selectedHabits.count)/\(maxOptional) optional habits selected")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Color(hex: "555555"))
                        .padding(.top, 8)
                        .padding(.bottom, 40)
                }
            }
        }
    }

    private func toggleHabit(_ type: HabitType) {
        if let idx = selectedHabits.firstIndex(of: type) {
            selectedHabits.remove(at: idx)
        } else if selectedHabits.count < maxOptional {
            selectedHabits.append(type)
        }
    }

    private func bindingForTarget(_ type: HabitType) -> Binding<Double> {
        switch type {
        case .sleep:    return $sleepTarget
        case .workout:  return $workoutTarget
        case .focus:    return $focusTarget
        default:        return .constant(0)
        }
    }
}

// MARK: - RequiredHabitCard

private struct RequiredHabitCard: View {
    let habitType: HabitType
    @Binding var limit: Double

    var body: some View {
        VStack(spacing: 0) {
            // Top row
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(hex: "F5A623").opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: habitType.icon)
                        .font(.system(size: 18))
                        .foregroundColor(Color(hex: "F5A623"))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(habitType.displayName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)

                        Text("REQUIRED")
                            .font(.system(size: 8, weight: .bold, design: .monospaced))
                            .tracking(0.8)
                            .foregroundColor(Color(hex: "F5A623"))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color(hex: "F5A623").opacity(0.12))
                            .cornerRadius(3)
                    }

                    Text(habitType.description)
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "555555"))
                        .lineLimit(2)
                }

                Spacer()

                // Lock icon
                Image(systemName: "lock.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "F5A623").opacity(0.6))
            }
            .padding(16)

            Divider().background(Color(hex: "2A2A2A"))

            // Stepper row
            HStack {
                Text("Daily limit")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "A0A0A0"))

                Spacer()

                Stepper(
                    value: $limit,
                    in: habitType.min...habitType.max,
                    step: habitType.step
                ) {
                    Text("\(formatVal(limit)) hrs")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "F5A623"))
                        .frame(minWidth: 60)
                }
                .tint(Color(hex: "F5A623"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color(hex: "F5A623").opacity(0.3), lineWidth: 1.5)
                )
        )
    }
}

// MARK: - OptionalHabitCard

private struct OptionalHabitCard: View {
    let habitType: HabitType
    let isSelected: Bool
    let canSelect: Bool
    @Binding var target: Double
    let onTap: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(isSelected ? Color(hex: "F5A623").opacity(0.1) : Color(hex: "1C1C1C"))
                        .frame(width: 44, height: 44)
                    Image(systemName: habitType.icon)
                        .font(.system(size: 18))
                        .foregroundColor(isSelected ? Color(hex: "F5A623") : Color(hex: "555555"))
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(habitType.displayName)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(isSelected ? .white : Color(hex: "A0A0A0"))

                    Text(habitType.description)
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "555555"))
                        .lineLimit(2)
                }

                Spacer()

                // Selection indicator
                ZStack {
                    Circle()
                        .fill(isSelected ? Color(hex: "F5A623") : Color.clear)
                        .frame(width: 24, height: 24)
                        .overlay(Circle().strokeBorder(isSelected ? Color(hex: "F5A623") : Color(hex: "3A3A3A"), lineWidth: 2))

                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "0A0A0A"))
                    }
                }
            }
            .padding(16)

            // Stepper (only when selected)
            if isSelected {
                Divider().background(Color(hex: "2A2A2A"))

                HStack {
                    Text("Target")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "A0A0A0"))

                    Spacer()

                    Stepper(
                        value: $target,
                        in: habitType.min...habitType.max,
                        step: habitType.step
                    ) {
                        Text("\(formatVal(target)) \(habitType.unit)")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(hex: "F5A623"))
                            .frame(minWidth: 72)
                    }
                    .tint(Color(hex: "F5A623"))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            isSelected ? Color(hex: "F5A623").opacity(0.4) : Color(hex: "2A2A2A"),
                            lineWidth: isSelected ? 1.5 : 1
                        )
                )
        )
        .opacity((!isSelected && !canSelect) ? 0.4 : 1.0)
        .onTapGesture(perform: onTap)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

// MARK: - Helpers

private func formatVal(_ v: Double) -> String {
    v == v.rounded() ? "\(Int(v))" : String(format: "%.1f", v)
}
