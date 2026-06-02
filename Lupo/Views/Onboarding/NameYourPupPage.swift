import SwiftUI

struct NameYourPupPage: View {
    @Binding var name: String
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Title
                Text("What will you\nname him?")
                    .font(.system(size: 36, weight: .black))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 36)

                // Text field
                VStack(spacing: 0) {
                    TextField("", text: $name)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                        .accentColor(Color(hex: "F5A623"))
                        .multilineTextAlignment(.center)
                        .placeholder(when: name.isEmpty) {
                            Text("LUPO")
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .tracking(4)
                                .foregroundColor(Color(hex: "3A3A3A"))
                        }
                        .focused($isFocused)
                        .onChange(of: name) { newValue in
                            if newValue.count > 20 {
                                name = String(newValue.prefix(20))
                            }
                        }
                        .padding(.bottom, 10)

                    // Gold underline
                    Rectangle()
                        .fill(isFocused ? Color(hex: "F5A623") : Color(hex: "2A2A2A"))
                        .frame(height: 2)
                        .animation(.easeInOut(duration: 0.2), value: isFocused)
                }
                .padding(.horizontal, 60)
                .padding(.bottom, 8)

                // Character count
                HStack {
                    Spacer()
                    Text("\(name.count)/20")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(Color(hex: "555555"))
                }
                .padding(.horizontal, 60)
                .padding(.bottom, 40)

                // Pup art
                PetArtView(stage: .newbornPup, mood: .neutral, energy: 0.5)
                    .frame(width: 140, height: 140)
                    .padding(.bottom, 20)

                // Subtitle
                Text("He starts as a pup.\nHow far he goes is up to you.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "555555"))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                Spacer()
                Spacer()
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                isFocused = true
            }
        }
    }
}

// MARK: - Placeholder modifier

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .center,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}
