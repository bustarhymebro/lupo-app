import WidgetKit
import SwiftUI

// MARK: - Shared UserDefaults Keys (App Group)

private extension UserDefaults {
    static var lupoShared: UserDefaults {
        UserDefaults(suiteName: "group.com.chlebholdings.lupo") ?? .standard
    }
}

// MARK: - Widget Entry

struct LupoWidgetEntry: TimelineEntry {
    let date: Date
    let petName: String
    let stage: Int
    let streak: Int
    let mood: String

    // Derived
    var petStage: PetStage { PetStage(rawValue: stage) ?? .newbornPup }
    var petMood: PetMood { PetMood(rawValue: mood) ?? .neutral }

    static var placeholder: LupoWidgetEntry {
        LupoWidgetEntry(
            date: Date(),
            petName: "Lupo",
            stage: 0,
            streak: 0,
            mood: PetMood.neutral.rawValue
        )
    }
}

// MARK: - Timeline Provider

struct LupoWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> LupoWidgetEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (LupoWidgetEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LupoWidgetEntry>) -> Void) {
        let entry = currentEntry()
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func currentEntry() -> LupoWidgetEntry {
        let defaults = UserDefaults.lupoShared
        return LupoWidgetEntry(
            date: Date(),
            petName: defaults.string(forKey: "widget.petName") ?? "Lupo",
            stage: defaults.integer(forKey: "widget.stage"),
            streak: defaults.integer(forKey: "widget.streak"),
            mood: defaults.string(forKey: "widget.mood") ?? PetMood.neutral.rawValue
        )
    }
}

// MARK: - Widget View

struct LupoWidgetView: View {
    let entry: LupoWidgetEntry

    private var moodColor: Color {
        switch entry.petMood {
        case .thriving:     return Color(hex: "22C55E")
        case .good:         return Color(hex: "F5A623")
        case .neutral:      return Color(hex: "A0A0A0")
        case .disappointed: return Color(hex: "EF4444")
        case .struggling:   return Color(hex: "7F1D1D")
        }
    }

    var body: some View {
        ZStack {
            // Background
            Color(hex: "0A0A0A")

            // Subtle grid
            Canvas { context, size in
                let spacing: CGFloat = 20
                var path = Path()
                var x: CGFloat = 0
                while x <= size.width {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                    x += spacing
                }
                var y: CGFloat = 0
                while y <= size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    y += spacing
                }
                context.stroke(path, with: .color(.white.opacity(0.03)), lineWidth: 0.5)
            }

            VStack(alignment: .leading, spacing: 0) {
                // Top: name + mood dot
                HStack(alignment: .center) {
                    Text(entry.petName.uppercased())
                        .font(.system(size: 13, weight: .black, design: .monospaced))
                        .tracking(1.5)
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Spacer()

                    Circle()
                        .fill(moodColor)
                        .frame(width: 8, height: 8)
                        .shadow(color: moodColor.opacity(0.6), radius: 3)
                }
                .padding(.horizontal, 14)
                .padding(.top, 12)

                // Wolf art — centered
                PetArtView(
                    stage: entry.petStage,
                    mood: entry.petMood,
                    energy: 0.7,
                    animated: false
                )
                .frame(maxWidth: .infinity)
                .frame(height: 72)
                .padding(.horizontal, 8)

                // Bottom: stage + streak
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("STAGE \(entry.stage)")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .tracking(1)
                            .foregroundColor(Color(hex: "F5A623"))

                        Text(entry.petStage.displayName.uppercased())
                            .font(.system(size: 8, design: .monospaced))
                            .tracking(0.5)
                            .foregroundColor(Color(hex: "555555"))
                    }

                    Spacer()

                    HStack(spacing: 3) {
                        Text("🔥")
                            .font(.system(size: 10))
                        Text("\(entry.streak)")
                            .font(.system(size: 14, weight: .black, design: .monospaced))
                            .foregroundColor(entry.streak > 0 ? Color(hex: "F5A623") : Color(hex: "555555"))
                    }
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 12)
            }
        }
        .containerBackground(Color(hex: "0A0A0A"), for: .widget)
    }
}

// MARK: - Widget Definition

struct LupoWidget: Widget {
    let kind: String = "LupoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LupoWidgetProvider()) { entry in
            LupoWidgetView(entry: entry)
        }
        .configurationDisplayName("Lupo")
        .description("Your wolf pup. Your discipline. At a glance.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Widget Bundle

@main
struct LupoWidgetBundle: WidgetBundle {
    var body: some Widget {
        LupoWidget()
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    LupoWidget()
} timeline: {
    LupoWidgetEntry(
        date: Date(),
        petName: "Lupo",
        stage: 2,
        streak: 14,
        mood: PetMood.thriving.rawValue
    )
    LupoWidgetEntry(
        date: Date(),
        petName: "Lupo",
        stage: 0,
        streak: 0,
        mood: PetMood.struggling.rawValue
    )
}
