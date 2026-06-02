import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var viewModel: AppViewModel

    @State private var currentPage: Int = 0
    @State private var petName: String = ""
    @State private var selectedHabits: [HabitType] = []
    @State private var screenTimeLimit: Double = 3.0

    private let totalPages = 3

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            // Page content
            TabView(selection: $currentPage) {
                WelcomePage()
                    .tag(0)

                NameYourPupPage(name: $petName)
                    .tag(1)

                ChooseHabitsPage(
                    selectedHabits: $selectedHabits,
                    screenTimeLimit: $screenTimeLimit
                )
                .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: currentPage)
            .ignoresSafeArea(edges: .top)

            // Bottom navigation
            VStack {
                Spacer()

                VStack(spacing: 16) {
                    // Page dots
                    HStack(spacing: 6) {
                        ForEach(0..<totalPages, id: \.self) { index in
                            Capsule()
                                .fill(index == currentPage ? Color(hex: "F5A623") : Color(hex: "2A2A2A"))
                                .frame(width: index == currentPage ? 20 : 6, height: 6)
                                .animation(.spring(response: 0.3, dampingFraction: 0.7), value: currentPage)
                        }
                    }

                    // CTA Button
                    Button(action: handleContinue) {
                        HStack(spacing: 8) {
                            Text(currentPage == totalPages - 1 ? "BEGIN" : "CONTINUE")
                                .font(.system(size: 15, weight: .black, design: .monospaced))
                                .tracking(2.5)
                                .foregroundColor(Color(hex: "0A0A0A"))

                            if currentPage < totalPages - 1 {
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Color(hex: "0A0A0A"))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color(hex: "F5A623"))
                        .cornerRadius(16)
                        .padding(.horizontal, 24)
                    }
                    .buttonStyle(.plain)
                    .disabled(currentPage == 1 && petName.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity((currentPage == 1 && petName.trimmingCharacters(in: .whitespaces).isEmpty) ? 0.4 : 1.0)
                    .animation(.easeInOut(duration: 0.2), value: petName)
                }
                .padding(.bottom, 44)
            }
        }
    }

    private func handleContinue() {
        if currentPage < totalPages - 1 {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentPage += 1
            }
        } else {
            // Final page — complete onboarding
            let name = petName.trimmingCharacters(in: .whitespaces)
            viewModel.completeOnboarding(
                petName: name.isEmpty ? "Lupo" : name,
                selectedHabits: selectedHabits
            )
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AppViewModel())
}
