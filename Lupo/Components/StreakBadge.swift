import SwiftUI

struct StreakBadge: View {
    let streak: Int

    @State private var flameScale: CGFloat = 1.0
    @State private var flameOpacity: Double = 1.0

    private var isActive: Bool { streak > 0 }
    private var isOnFire: Bool { streak > 7 }

    var body: some View {
        HStack(spacing: 5) {
            // Flame icon
            Text("🔥")
                .font(.system(size: 14))
                .scaleEffect(flameScale)
                .opacity(isOnFire ? flameOpacity : (isActive ? 0.9 : 0.4))

            // Streak text
            Text("\(streak) DAY STREAK")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .tracking(1.2)
                .foregroundColor(isActive ? Color(hex: "F5A623") : Color(hex: "A0A0A0"))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(isActive ? Color(hex: "F5A623").opacity(0.1) : Color(hex: "1C1C1C"))
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isActive ? Color(hex: "F5A623").opacity(0.25) : Color(hex: "2A2A2A"),
                            lineWidth: 1
                        )
                )
        )
        .onAppear {
            if isOnFire {
                startFlameAnimation()
            }
        }
        .onChange(of: streak) { newStreak in
            if newStreak > 7 {
                startFlameAnimation()
            }
        }
    }

    private func startFlameAnimation() {
        withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) {
            flameScale = 1.25
            flameOpacity = 0.7
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        StreakBadge(streak: 0)
        StreakBadge(streak: 3)
        StreakBadge(streak: 14)
    }
    .padding()
    .background(Color(hex: "0A0A0A"))
}
