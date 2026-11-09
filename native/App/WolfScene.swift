import SwiftUI

struct WolfScene: View {
    var nourishment: Int
    var stage: String = "Pup"
    var den: String = "Pine forest"
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var breathing = false
    @State private var response = false
    @MainActor private static let images: [String: Image] = {
        var images: [String: Image] = [:]
        for name in ["forest-dawn", "wolf-pup", "wolf-yearling", "wolf-scout", "wolf-hunter", "wolf-alpha"] {
            guard let url = Bundle.main.url(forResource: name, withExtension: "png") else { continue }
            #if os(iOS)
            if let image = UIImage(contentsOfFile: url.path) { images[name] = Image(uiImage: image) }
            #else
            if let image = NSImage(contentsOf: url) { images[name] = Image(nsImage: image) }
            #endif
        }
        return images
    }()
    private func artwork(_ name: String) -> Image {
        Self.images[name] ?? Image(systemName: "pawprint.fill")
    }
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                artwork("forest-dawn").resizable().scaledToFill()
                    .frame(width: geometry.size.width, height: 310).clipped()
                    .overlay {
                        if den == "Moonlit lake" { Color(red: 0.14, green: 0.18, blue: 0.43).opacity(0.45) }
                        else if den == "Autumn ridge" { Color(red: 0.68, green: 0.28, blue: 0.08).opacity(0.22) }
                        else if colorScheme == .dark { Color(red: 0.04, green: 0.13, blue: 0.17).opacity(0.25) }
                    }
                Ellipse().fill(Color(red: 0.12, green: 0.20, blue: 0.15).opacity(0.25))
                    .frame(width: 128, height: 16).blur(radius: 8).offset(y: 120)
                artwork("wolf-\(stage.lowercased())").resizable().scaledToFit()
                    .frame(width: max(0, min(geometry.size.width - 48, 290)), height: 270)
                    .scaleEffect(response && !reduceMotion ? 1.035 : breathing && !reduceMotion ? 1.012 : 1, anchor: .bottom)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 2.8).repeatForever(autoreverses: true), value: breathing)
                    .rotationEffect(.degrees(nourishment < 25 ? -3 : 0), anchor: .bottom)
                    .saturation(nourishment < 25 ? 0.75 : 1)
                    .offset(y: 8)
                    .accessibilityHidden(true)
            }.frame(width: geometry.size.width, height: 310)
        }
        .frame(height: 310).clipShape(RoundedRectangle(cornerRadius: 28))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(stage) wolf in a woodland clearing. \(nourishment < 25 ? "Hungry and ready for a meal." : "Content and glad you're here.")")
        .onAppear { breathing = !reduceMotion }
        .onChange(of: reduceMotion) { _, reduced in breathing = !reduced }
        .onChange(of: nourishment) { old, new in
            if new > old && !reduceMotion {
                withAnimation(.easeOut(duration: 0.22)) { response = true }
                Task { try? await Task.sleep(for: .milliseconds(350)); withAnimation(.easeOut(duration: 0.22)) { response = false } }
            }
        }
    }
}
