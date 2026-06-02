import SwiftUI

struct EnergyBarView: View {
    let energy: Double   // 0.0–1.0
    var showLabel: Bool = true
    var height: CGFloat = 8

    private var fillColor: Color {
        // Lerp from red (low) through amber (mid) to green (full)
        if energy < 0.5 {
            let t = energy * 2.0
            return Color(
                red: lerp(0xEF, 0xF5, t) / 255.0,
                green: lerp(0x44, 0xA6, t) / 255.0,
                blue: lerp(0x44, 0x23, t) / 255.0
            )
        } else {
            let t = (energy - 0.5) * 2.0
            return Color(
                red: lerp(0xF5, 0x22, t) / 255.0,
                green: lerp(0xA6, 0xC5, t) / 255.0,
                blue: lerp(0x23, 0x5E, t) / 255.0
            )
        }
    }

    private func lerp(_ a: Int, _ b: Int, _ t: Double) -> Double {
        Double(a) + (Double(b) - Double(a)) * min(1, max(0, t))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if showLabel {
                HStack {
                    Text("ENERGY")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .foregroundColor(Color(hex: "A0A0A0"))
                        .tracking(1.5)

                    Spacer()

                    Text("\(Int(energy * 100))%")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(fillColor)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(Color(hex: "1C1C1C"))
                        .overlay(
                            RoundedRectangle(cornerRadius: height / 2)
                                .strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1)
                        )

                    // Fill
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(
                            LinearGradient(
                                colors: [fillColor.opacity(0.8), fillColor],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: max(height, geo.size.width * CGFloat(energy)))
                        .animation(.easeInOut(duration: 0.6), value: energy)

                    // Glow on high energy
                    if energy > 0.7 {
                        RoundedRectangle(cornerRadius: height / 2)
                            .fill(fillColor.opacity(0.3))
                            .frame(width: geo.size.width * CGFloat(energy))
                            .blur(radius: 3)
                            .animation(.easeInOut(duration: 0.6), value: energy)
                    }
                }
                .frame(height: height)
            }
            .frame(height: height)
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        EnergyBarView(energy: 0.9)
        EnergyBarView(energy: 0.6)
        EnergyBarView(energy: 0.35)
        EnergyBarView(energy: 0.1)
    }
    .padding()
    .background(Color(hex: "0A0A0A"))
}
