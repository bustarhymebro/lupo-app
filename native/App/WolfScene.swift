import SwiftUI

struct WolfScene: View {
    var nourishment: Int
    var stage: String = "Pup"
    var den: String = "Pine forest"
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var breathing = false
    @State private var response = false
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Image("forest-dawn").resizable().scaledToFill()
                    .frame(width: geometry.size.width, height: 310).clipped()
                    .overlay {
                        if den == "Moonlit lake" { Color(red: 0.14, green: 0.18, blue: 0.43).opacity(0.45) }
                        else if den == "Autumn ridge" { Color(red: 0.68, green: 0.28, blue: 0.08).opacity(0.22) }
                        else if colorScheme == .dark { Color(red: 0.04, green: 0.13, blue: 0.17).opacity(0.25) }
                    }
                Ellipse().fill(Color(red: 0.12, green: 0.20, blue: 0.15).opacity(0.25))
                    .frame(width: 128, height: 16).blur(radius: 8).offset(y: 120)
                Image("wolf-\(stage.lowercased())").resizable().scaledToFit()
                    .frame(width: min(geometry.size.width - 48, 290), height: 270)
                    .scaleEffect(response && !reduceMotion ? 1.035 : breathing && !reduceMotion ? 1.012 : 1, anchor: .bottom)
                    .rotationEffect(.degrees(nourishment < 25 ? -3 : 0), anchor: .bottom)
                    .saturation(nourishment < 25 ? 0.75 : 1)
                    .offset(y: 8)
                    .accessibilityHidden(true)
            }.frame(width: geometry.size.width, height: 310)
        }
        .frame(height: 310).clipShape(RoundedRectangle(cornerRadius: 28))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(stage) wolf in a woodland clearing. \(nourishment < 25 ? "Hungry and ready for a meal." : "Content and glad you're here.")")
        .onAppear { if !reduceMotion { withAnimation(.easeInOut(duration: 2.8).repeatForever(autoreverses: true)) { breathing = true } } }
        .onChange(of: nourishment) { old, new in
            if new > old && !reduceMotion {
                withAnimation(.easeOut(duration: 0.22)) { response = true }
                Task { try? await Task.sleep(for: .milliseconds(350)); withAnimation(.easeOut(duration: 0.22)) { response = false } }
            }
        }
    }
}
