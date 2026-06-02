import SwiftUI

struct WelcomePage: View {
    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Wolf art — full majestic adult
                PetArtView(stage: .adultWolf, mood: .thriving, energy: 1.0)
                    .frame(width: 260, height: 260)
                    .padding(.bottom, 8)

                // Title
                Text("Meet Lupo.")
                    .font(.system(size: 40, weight: .black))
                    .foregroundColor(.white)
                    .padding(.bottom, 16)

                // Description
                Text("A wolf you raise by earning it.\nStay consistent in real life — he grows.\nSlip — he regresses.\nHe expects more from you.")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Color(hex: "A0A0A0"))
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 36)

                // Tagline
                Text("NOT AN APP. A STANDARD.")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .tracking(3)
                    .foregroundColor(Color(hex: "F5A623"))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(
                        Capsule()
                            .strokeBorder(Color(hex: "F5A623").opacity(0.3), lineWidth: 1)
                    )

                Spacer()
                Spacer()
            }
        }
    }
}

#Preview {
    WelcomePage()
}
