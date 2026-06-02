import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Design Tokens
extension Color {
    static let lupoBackground = Color(hex: "0A0A0A")
    static let lupoSurface = Color(hex: "141414")
    static let lupoSurface2 = Color(hex: "1C1C1C")
    static let lupoSurface3 = Color(hex: "242424")
    static let lupoAccent = Color(hex: "F5A623")
    static let lupoTextPrimary = Color.white
    static let lupoTextSecondary = Color(hex: "A0A0A0")
    static let lupoSuccess = Color(hex: "22C55E")
    static let lupoDanger = Color(hex: "EF4444")
    static let lupoBorder = Color(hex: "2A2A2A")
}
