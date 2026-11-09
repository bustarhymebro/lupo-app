import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

@main
struct LupoRebornApp: App {
    @StateObject private var store = LupoStore()
    @StateObject private var membership = Membership()
    @StateObject private var reminders = ReminderService()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store).environmentObject(membership).environmentObject(reminders)
                .task { await reminders.synchronize(store.state) }
                .onChange(of: store.state) { _, state in Task { await reminders.synchronize(state) } }
                .task {
                    while !Task.isCancelled {
                        if GameClock().key(Date()) > store.state.lastDay { store.apply { try $0.open(at: Date()) } }
                        do { try await Task.sleep(for: .seconds(30)) } catch { return }
                    }
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { store.apply { try $0.open(at: Date()) }; Task { await membership.refresh() } }
                }
        }
        #if os(macOS)
        .defaultSize(width: 430, height: 900)
        #endif
    }
}

enum Theme {
    static let background = adaptive(light: (0.97,0.96,0.92), dark: (0.035,0.075,0.08))
    static let panel = adaptive(light: (0.91,0.94,0.87), dark: (0.075,0.13,0.14))
    static let accent = adaptive(light: (0.28,0.39,0.24), dark: (0.83,0.91,0.58))
    static let onAccent = adaptive(light: (0.98,0.98,0.95), dark: (0.035,0.075,0.08))
    private static func adaptive(light: (Double,Double,Double), dark: (Double,Double,Double)) -> Color {
        #if os(iOS)
        return Color(uiColor: UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
        #else
        return Color(nsColor: NSColor(name: nil) { appearance in
            let c = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light
            return NSColor(srgbRed: c.0, green: c.1, blue: c.2, alpha: 1)
        })
        #endif
    }
}

struct TouchButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.frame(minHeight: 44).contentShape(Rectangle())
            .opacity(enabled ? (configuration.isPressed ? 0.7 : 1) : 0.45)
    }
}

struct RootView: View {
    @EnvironmentObject var store: LupoStore
    var body: some View {
        Group {
            if store.storageBlocked { SettingsView() }
            else if store.state.onboarded {
                TabView {
                    HomeView().tabItem { Label("Companion", systemImage: "pawprint.fill") }
                    GoalsView().tabItem { Label("Today", systemImage: "checkmark.circle") }
                    JourneyView().tabItem { Label("Journey", systemImage: "map") }
                    DenView().tabItem { Label("Den", systemImage: "moon.stars") }
                }
            } else { AdoptionView() }
        }
        .tint(Theme.accent)
        .alert("Lupo", isPresented: Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })) {
            Button("OK") { store.message = nil }
        } message: { Text(store.message ?? "") }
    }
}

struct Screen<Content: View>: View {
    let title: String
    var showsClose = false
    @Environment(\.dismiss) private var dismiss
    @ViewBuilder var content: () -> Content
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24, content: content)
                    .frame(maxWidth: 560).padding(20).frame(maxWidth: .infinity)
            }.scrollDismissesKeyboard(.interactively)
            .background(Theme.background).navigationTitle(title).buttonStyle(TouchButtonStyle())
            .toolbar {
                if showsClose { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
                #if os(iOS)
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }.accessibilityIdentifier("keyboard.done")
                }
                #endif
            }
        }
    }
}

struct ActionButton: View {
    var title: String; var icon: String = "arrow.right"; var action: () -> Void
    @Environment(\.isEnabled) private var enabled
    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 16)
        }.buttonStyle(TouchButtonStyle()).foregroundStyle(Theme.onAccent).background(enabled ? Theme.accent : Theme.accent.opacity(0.3), in: RoundedRectangle(cornerRadius: 18))
    }
}

struct AdoptionView: View {
    @EnvironmentObject var store: LupoStore
    @State private var step = 0
    @State private var name = "Ash"
    @State private var selected = 0
    @State private var cue = "After my morning coffee"
    private let choices = [Habit(title: "Read 5 pages", cue: "After my morning coffee", symbol: "book.closed"), Habit(title: "Walk outside for 10 minutes", cue: "After lunch", symbol: "sun.max"), Habit(title: "Put my phone away", cue: "Before getting into bed", symbol: "moon")]
    var body: some View {
        Screen(title: step == 0 ? "A little friend. A fresh start." : step == 1 ? "One small promise" : "Your first meal together") {
            HStack {
                Text("Step \(step + 1) of 3").font(.subheadline).foregroundStyle(.secondary)
                Spacer()
                if step > 0 { Button("Back", systemImage: "chevron.left") { step -= 1 } }
            }
            ProgressView(value: Double(step + 1), total: 3).accessibilityLabel("Setup progress")
            if step != 1 { WolfScene(nourishment: 70) }
            if step == 0 {
                Text("Care for yourself. Grow together.").font(.title.bold())
                Text("Your small daily wins become meals and adventures for a wolf of your own.").foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your wolf's name").font(.headline)
                    TextField("For example, Ash", text: $name).textFieldStyle(.roundedBorder).frame(minHeight: 44)
                    if name.count > 24 { Text("Choose a name with 24 characters or fewer.").font(.footnote).foregroundStyle(.red) }
                }
                ActionButton(title: "Meet \(name.isEmpty ? "your wolf" : name)", icon: "pawprint.fill") { step = 1 }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.count > 24)
                Text("No account. No payment. Just a beginning.").font(.footnote).foregroundStyle(.secondary)
            } else if step == 1 {
                Text("Start so small you can show up on a busy day. You can change your routine later.").foregroundStyle(.secondary)
                ForEach(choices.indices, id: \.self) { i in
                    Button { selected = i; cue = choices[i].cue } label: {
                        HStack(spacing: 12) {
                            Image(systemName: choices[i].symbol).frame(width: 24)
                            Text(choices[i].title).multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: selected == i ? "checkmark.circle.fill" : "circle")
                        }.padding(16).background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                    }.buttonStyle(TouchButtonStyle()).accessibilityAddTraits(selected == i ? .isSelected : [])
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("When will you do it?").font(.headline)
                    TextField("After something you already do", text: $cue).textFieldStyle(.roundedBorder).frame(minHeight: 44)
                    Text("A familiar cue makes a small goal easier to remember.").font(.footnote).foregroundStyle(.secondary)
                }
                ActionButton(title: "Make room for this") { step = 2 }.disabled(cue.count > 120)
            } else {
                Text("A welcome meal for \(name).").font(.title.bold())
                Text("This one's on us. After today, completing a goal earns a meal. Feeding restores nourishment and helps your wolf explore.").foregroundStyle(.secondary)
                Text("Miss a day? Come back with one small win. Your wolf's growth stays with you, and recovery is always free.").font(.subheadline).foregroundStyle(.secondary)
                ActionButton(title: "Share the welcome meal", icon: "carrot.fill") {
                    var habit = choices[selected]; habit.cue = cue
                    store.apply {
                        try $0.adopt(name: name, intention: "Make room for small daily wins", habits: [habit], at: Date())
                        try $0.feed(at: Date())
                    }
                }
            }
        }
    }
}

struct HomeView: View {
    @EnvironmentObject var store: LupoStore
    @EnvironmentObject var membership: Membership
    @State private var focusOpen = false
    @State private var showingTrails = false
    var body: some View {
        Screen(title: store.state.name) {
            HStack {
                Label(store.state.stage.uppercased(), systemImage: "sparkle").font(.caption.bold()).tracking(2)
                Spacer(); Text("\(store.state.bond) bond").font(.subheadline.monospacedDigit()).accessibilityIdentifier("companion.bond")
            }.foregroundStyle(Theme.accent)
            WolfScene(nourishment: store.state.nourishment, stage: store.state.stage, den: membership.active ? store.state.den : "Pine forest")
            HStack(alignment: .firstTextBaseline) {
                Text(store.state.mood).font(.title.bold()); Spacer()
                Label("\(store.state.food) \(store.state.food == 1 ? "meal" : "meals")", systemImage: "carrot.fill").font(.subheadline).accessibilityIdentifier("companion.meals")
            }
            ProgressView(value: Double(store.state.nourishment), total: 100).tint(Theme.accent)
                .accessibilityLabel("Nourishment").accessibilityValue("\(store.state.nourishment) out of 100")
            Text(store.state.nourishment < 25 ? "A small win will bring the spark back. Complete one goal, then share a meal." : "Your next small win becomes their next adventure.").foregroundStyle(.secondary)
            if store.state.food > 0 && store.state.nourishment < 100 {
                ActionButton(title: "Share a meal", icon: "carrot.fill") { store.apply { try $0.feed(at: Date()) } }
            } else if let next = store.day.scheduled.first(where: { !store.day.completed.contains($0.id) }), !store.day.rest {
                Text("One small thing for you").font(.headline)
                GoalRow(habit: next)
            } else if !store.day.completed.isEmpty && store.state.nourishment >= 25 && store.day.expedition == nil {
                ActionButton(title: "Explore together", icon: "map") { store.apply { game in _ = try game.explore(at: Date()) } }
            } else {
                Label(store.day.rest ? "Rest is part of growing." : "You showed up. Enjoy the rest of your day.", systemImage: "checkmark.seal")
                    .font(.headline).foregroundStyle(Theme.accent)
            }
            if store.canUndoGoal { Button("Undo last check-in", systemImage: "arrow.uturn.backward") { store.undoLastGoal() } }
            VStack(alignment: .leading, spacing: 14) {
                HStack { Text("Today's small wins").font(.headline); Spacer(); Text("\(store.day.completed.count)/\(store.day.scheduled.count)").monospacedDigit() }
                if store.day.rest { Label("Rest day. The trail can wait.", systemImage: "moon.zzz") }
                else if store.day.scheduled.isEmpty { Text("No goals scheduled today. Enjoy the space.").foregroundStyle(.secondary) }
                else {
                    ForEach(store.day.scheduled) { habit in
                        Label(habit.title, systemImage: store.day.completed.contains(habit.id) ? "checkmark.circle.fill" : "circle")
                            .font(.subheadline).foregroundStyle(.secondary)
                            .accessibilityLabel("\(habit.title), \(store.day.completed.contains(habit.id) ? "completed" : "not yet completed")")
                    }
                    Text("Manage your routine in Today.").font(.caption).foregroundStyle(.secondary)
                }
            }.padding(18).background(Theme.panel, in: RoundedRectangle(cornerRadius: 22))
            Button { focusOpen = true } label: {
                Label(store.state.focus == nil ? "Make room for a little focus" : "Return to your focus session", systemImage: "timer").frame(maxWidth: .infinity).padding()
            }.buttonStyle(.bordered)
            Button(store.state.trail == nil ? "Find a guided trail" : "Continue your guided trail", systemImage: "leaf") { showingTrails = true }
            if let found = store.day.expedition {
                Label(found, systemImage: "sparkles").padding().background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
            } else if store.day.completed.isEmpty || store.state.nourishment < 25 {
                Text("Complete a goal and keep nourishment at 25 or more to discover today's trail.").font(.caption).foregroundStyle(.secondary)
            }
        }.sheet(isPresented: $focusOpen) { FocusView() }.sheet(isPresented: $showingTrails) { TrailsView() }
    }
}

struct GoalRow: View {
    @EnvironmentObject var store: LupoStore
    var habit: Habit
    var done: Bool { store.day.completed.contains(habit.id) }
    var body: some View {
        Button { store.completeGoal(habit.id) } label: {
            HStack(spacing: 14) {
                Image(systemName: done ? "checkmark.circle.fill" : habit.symbol).font(.title3).foregroundStyle(Theme.accent).frame(width: 25)
                VStack(alignment: .leading, spacing: 4) { Text(habit.title).font(.headline); Text(habit.cue).font(.caption).foregroundStyle(.secondary) }
                Spacer(); if !done { Text("+1 meal").font(.caption).foregroundStyle(Theme.accent) }
            }.padding(.vertical, 10).contentShape(Rectangle())
        }.buttonStyle(TouchButtonStyle()).disabled(done || store.day.rest)
        .accessibilityLabel("\(habit.title), \(done ? "completed" : "complete to earn one meal")")
        .accessibilityIdentifier("goal.complete.\(habit.title)")
    }
}

struct GoalsView: View {
    @EnvironmentObject var store: LupoStore
    @State private var adding = false
    @State private var editing: Habit?
    var body: some View {
        Screen(title: "Little things, often") {
            Text(store.state.intention).font(.title2).foregroundStyle(Theme.accent)
            Text("Today's small wins").font(.headline)
            ForEach(store.day.scheduled) { GoalRow(habit: $0) }
            if store.canUndoGoal { Button("Undo last check-in", systemImage: "arrow.uturn.backward") { store.undoLastGoal() } }
            if store.day.rest { Text("Today is a rest day. Nothing to make up tomorrow.") }
            Divider()
            Text("Make it work for you").font(.title2.bold())
            Text("Edit the goal, choose your days, or make it smaller. Changes begin tomorrow.").font(.subheadline).foregroundStyle(.secondary)
            ForEach(store.state.habits) { habit in
                Button { editing = habit } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(habit.title).font(.headline)
                            Text(habit.cue).font(.subheadline).foregroundStyle(.secondary)
                            Text(habit.weekdays.count == 7 ? "Every day" : "\(habit.weekdays.count) days a week").font(.footnote).foregroundStyle(.secondary)
                        }
                        Spacer(); Image(systemName: "pencil")
                    }.padding(.vertical, 12)
                }.buttonStyle(TouchButtonStyle()).accessibilityHint("Edit this goal and its schedule").accessibilityIdentifier("goal.edit.\(habit.title)")
                Divider()
            }
            Button("Add a small goal", systemImage: "plus") { adding = true }.disabled(store.state.habits.count >= 3)
            if store.state.habits.count >= 3 { Text("Three small commitments are enough. Make one easier before adding more.").font(.footnote).foregroundStyle(.secondary) }
            Button("Take a rest day", systemImage: "moon.zzz") { store.apply { try $0.rest(at: Date()) } }
                .disabled(store.day.rest || !store.day.completed.isEmpty || store.day.focusMinutes > 0 || store.state.focus != nil || store.state.trailRewardDay == store.state.lastDay)
            Text("Rest protects today's nourishment. Set it before completing goals, trail steps or a focus session.").font(.footnote).foregroundStyle(.secondary)
        }.sheet(isPresented: $adding) { AddGoalView() }.sheet(item: $editing) { AddGoalView(editing: $0) }
    }
}

struct AddGoalView: View {
    @EnvironmentObject var store: LupoStore
    @Environment(\.dismiss) var dismiss
    var editing: Habit?
    @State private var title: String
    @State private var cue: String
    @State private var days: Set<Int>
    @State private var confirmRemove = false
    init(editing: Habit? = nil) {
        self.editing = editing
        _title = State(initialValue: editing?.title ?? "")
        _cue = State(initialValue: editing?.cue ?? "")
        _days = State(initialValue: editing?.weekdays ?? Set(1...7))
    }
    var body: some View {
        Screen(title: editing == nil ? "One small promise" : "Make this goal fit", showsClose: true) {
            VStack(alignment: .leading, spacing: 8) {
                Text("What will you do?").font(.headline)
                TextField("For example, read 5 pages", text: $title).textFieldStyle(.roundedBorder).frame(minHeight: 44).accessibilityIdentifier("goal.title")
                if title.count > 80 { Text("Keep your goal under 80 characters.").font(.footnote).foregroundStyle(.red) }
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("When will you do it?").font(.headline)
                TextField("For example, after coffee", text: $cue).textFieldStyle(.roundedBorder).frame(minHeight: 44)
            }
            Text("Which days feel realistic?").font(.headline)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: 8) {
                ForEach([2,3,4,5,6,7,1], id: \.self) { weekday in
                    Button { if days.contains(weekday) { days.remove(weekday) } else { days.insert(weekday) } } label: {
                        Text(Calendar.current.shortWeekdaySymbols[weekday - 1]).font(.subheadline)
                            .frame(minWidth: 44, minHeight: 44)
                            .background(days.contains(weekday) ? Theme.accent : Theme.panel, in: RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(days.contains(weekday) ? Theme.onAccent : .primary)
                    }.accessibilityLabel(Calendar.current.weekdaySymbols[weekday - 1]).accessibilityAddTraits(days.contains(weekday) ? .isSelected : [])
                }
            }
            if days.isEmpty { Text("Choose at least one day.").font(.footnote).foregroundStyle(.red) }
            Text("Choose something you can do even on a busy day. Your updated routine begins tomorrow.").foregroundStyle(.secondary)
            ActionButton(title: editing == nil ? "Add to my routine" : "Save my changes") {
                let habit = Habit(id: editing?.id ?? UUID(), title: title, cue: cue, symbol: editing?.symbol ?? "leaf", weekdays: days)
                store.apply { if editing != nil { try $0.editHabit(habit, at: Date()) } else { try $0.addHabit(habit, at: Date()) } }
                if store.message == nil { dismiss() }
            }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || title.count > 80 || cue.count > 120 || days.isEmpty)
            if editing != nil { Button("Remove from my routine", role: .destructive) { confirmRemove = true } }
            Button("Close") { dismiss() }
        }
        .confirmationDialog("Remove this goal from your routine?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Remove goal", role: .destructive) { if let editing { store.apply { $0.removeHabit(editing.id) } }; dismiss() }
            Button("Keep goal", role: .cancel) { }
        } message: { Text("Today's record and your past progress stay intact.") }
    }
}

struct FocusView: View {
    @EnvironmentObject var store: LupoStore
    @Environment(\.dismiss) var dismiss
    @State private var minutes = 10
    var body: some View {
        Screen(title: "A little breathing room", showsClose: true) {
            WolfScene(nourishment: store.state.nourishment, stage: store.state.stage)
            if let session = store.state.focus {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let remaining = max(0, Int(ceil(Double(session.duration * 60) - context.date.timeIntervalSince(session.started))))
                    Text(String(format: "%02d:%02d", remaining / 60, remaining % 60)).font(.system(size: 64, weight: .light, design: .rounded)).monospacedDigit().frame(maxWidth: .infinity)
                    if remaining == 0 {
                        ActionButton(title: "Finish focus", icon: "checkmark") { store.apply { try $0.finishFocus(at: Date()) } }
                    }
                }
                Button("End without a reward") { store.apply { $0.cancelFocus() } }
            } else {
                Picker("Minutes", selection: $minutes) { ForEach([5,10,25,50], id: \.self) { Text("\($0)m").tag($0) } }.pickerStyle(.segmented)
                Text("Put your phone down and make room for what matters. Your first completed session each day earns one meal.").foregroundStyle(.secondary)
                ActionButton(title: "Begin \(minutes) minutes", icon: "timer") { store.apply { try $0.startFocus(minutes: minutes, at: Date()) } }.disabled(store.day.rest)
            }
            Text("This is a focus timer. It doesn't block apps or verify Screen Time.").font(.caption).foregroundStyle(.secondary)
            Button("Close") { dismiss() }
        }
    }
}

struct JourneyView: View {
    @EnvironmentObject var store: LupoStore
    @State private var showingTrails = false
    var body: some View {
        Screen(title: "Look how far you've come") {
            WeeklyReview(state: store.state)
            Button("Guided trails & your notes", systemImage: "leaf") { showingTrails = true }
            Text("\(store.state.bond)").font(.system(size: 60, weight: .light, design: .rounded)).foregroundStyle(Theme.accent)
            Text("Bond earned through real-life effort. It never disappears after a missed day.").foregroundStyle(.secondary)
            HStack { Label("\(store.state.days.values.filter { !$0.completed.isEmpty }.count) active days", systemImage: "sun.max"); Spacer(); Label("\(store.state.days.values.reduce(0) { $0 + $1.focusMinutes }) min", systemImage: "timer") }.font(.subheadline)
            ForEach(Array([("Pup", 0), ("Yearling", 100), ("Scout", 350), ("Hunter", 800), ("Alpha", 1600)].enumerated()), id: \.offset) { _, item in
                HStack { Image(systemName: store.state.bond >= item.1 ? "pawprint.fill" : "circle.dotted"); Text(item.0); Spacer(); Text("\(item.1) bond") }.padding().background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
            }
            Text("Trail journal").font(.title2.bold())
            if store.state.discoveries.isEmpty { Text("Your first discovery is waiting. Complete a goal, share a meal, then explore.").foregroundStyle(.secondary) }
            ForEach(Array(store.state.discoveries.enumerated().reversed()), id: \.offset) { i, item in Label("\(i + 1). \(item)", systemImage: "sparkles").padding(.vertical, 8) }
            ShareLink(item: "I'm raising \(store.state.name) in Lupo, one small promise at a time. \(store.state.bond) bond earned.") { Label("Share your progress", systemImage: "square.and.arrow.up") }
        }.sheet(isPresented: $showingTrails) { TrailsView() }
    }
}

struct DenView: View {
    @EnvironmentObject var store: LupoStore
    @EnvironmentObject var membership: Membership
    @State private var plus = false
    @State private var settings = false
    var body: some View {
        Screen(title: "A place of your own") {
            WolfScene(nourishment: store.state.nourishment, stage: store.state.stage, den: membership.active ? store.state.den : "Pine forest")
            Text("Make yourself at home").font(.title2.bold())
            ForEach(["Pine forest", "Moonlit lake", "Autumn ridge"], id: \.self) { den in
                Button {
                    if den != "Pine forest" && !membership.active { plus = true }
                    else { store.apply { try $0.chooseDen(den, premium: membership.active) } }
                } label: {
                    HStack { Text(den); Spacer(); Image(systemName: den == store.state.den ? "checkmark.circle.fill" : den == "Pine forest" || membership.active ? "circle" : "lock") }.padding().background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                }.buttonStyle(.plain)
            }
            Button(membership.active ? "Your Lupo Plus unlock" : "Explore Lupo Plus", systemImage: "sparkles") { plus = true }
            Button("Settings & your data", systemImage: "gearshape") { settings = true }
        }.sheet(isPresented: $plus) { MembershipView() }.sheet(isPresented: $settings) { SettingsView() }
    }
}

struct MembershipView: View {
    @EnvironmentObject var membership: Membership
    @Environment(\.dismiss) var dismiss
    var body: some View {
        Screen(title: "More room to roam", showsClose: true) {
            Text("LUPO PLUS").font(.caption.bold()).tracking(3).foregroundStyle(Theme.accent)
            Text("Small routines. A world of your own.").font(.largeTitle.bold())
            Text("Unlock two guided trails with 28 practical steps for focus and evenings, plus Moonlit Lake and Autumn Ridge scenery. One purchase, no subscription. Your wolf, daily goals, fresh-start trail, reminders, weekly review and recovery stay free.").foregroundStyle(.secondary)
            if membership.active { Label("Lupo Plus is unlocked", systemImage: "checkmark.seal.fill") }
            else {
                ForEach(membership.products, id: \.id) { product in
                    ActionButton(title: "Unlock Plus · \(product.displayPrice)", icon: "sparkles") { Task { await membership.purchase(product) } }.disabled(membership.busy)
                }
            }
            if let status = membership.status { Text(status).font(.subheadline) }
            Text("A one-time purchase charged to your Apple Account. Restore the unlock on supported devices using the same Apple Account. Your personal progress transfers separately through an exported backup.").font(.footnote).foregroundStyle(.secondary)
            Button("Restore purchases") { Task { await membership.restore() } }.disabled(membership.busy)
            Button("Refresh App Store") { Task { await membership.load() } }.disabled(membership.busy)
            Link("Privacy policy", destination: URL(string: "https://raiselupo.chleb.ai/privacy.html")!)
            Link("Terms of use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
            Button("Close") { dismiss() }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var store: LupoStore
    @Environment(\.dismiss) var dismiss
    @State private var exporting = false
    @State private var importing = false
    @State private var backup: Data?
    @State private var confirmReset = false
    @State private var showingReminders = false
    var body: some View {
        Screen(title: "Your wolf, your data", showsClose: !store.storageBlocked) {
            if !store.storageBlocked { Button("Close") { dismiss() } }
            Text("Your progress is stored on this device. No account, ads, or analytics are included in this build. Export a backup before changing devices.").foregroundStyle(.secondary)
            if !store.storageBlocked { Button("Reminder settings", systemImage: "bell") { showingReminders = true } }
            Button("Export my data", systemImage: "square.and.arrow.up") { exporting = true }
            Button("Restore a backup", systemImage: "square.and.arrow.down") { importing = true }
            Link("Contact support", destination: URL(string: "https://raiselupo.chleb.ai/support.html")!)
            Link("Privacy policy", destination: URL(string: "https://raiselupo.chleb.ai/privacy.html")!)
            Text("A new day begins at 4 a.m. local time. Missed days lower nourishment by 20. Earn meals through goals; each meal restores 30. Your bond and discoveries are permanent.").font(.subheadline)
            Text("Screen Time verification is not enabled in this build.").font(.caption).foregroundStyle(.secondary)
            Button("Delete my data and start again", role: .destructive) { confirmReset = true }
        }
        .sheet(isPresented: $showingReminders) { RemindersView() }
        .fileExporter(isPresented: $exporting, document: LupoDocument(data: store.export()), contentType: .json, defaultFilename: "lupo-backup") { result in
            if case .failure = result { store.message = "Couldn't export your data. Please try again." }
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            do {
                let url = try result.get()
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                guard size <= 10_000_000 else { throw LupoError.invalidSave }
                backup = try Data(contentsOf: url)
            } catch { store.message = "Couldn't read that backup file." }
        }
        .confirmationDialog("Replace this device's progress with the backup?", isPresented: Binding(get: { backup != nil }, set: { if !$0 { backup = nil } }), titleVisibility: .visible) {
            Button("Restore backup") { if let backup { store.restoreBackup(backup) }; backup = nil }
            Button("Cancel", role: .cancel) { backup = nil }
        }
        .confirmationDialog("Delete this wolf and all local progress?", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("Delete my data", role: .destructive) { store.reset() }
            Button("Keep my wolf", role: .cancel) { }
        } message: { Text("This cannot be undone. Export a backup first if you want to keep a copy. Your Lupo Plus purchase can be restored separately.") }
    }
}


struct WeeklyReview: View {
    let state: Companion
    private var records: [(String, Day)] {
        let clock = GameClock()
        guard let end = clock.date(state.lastDay) else { return [] }
        return (0..<7).reversed().compactMap { offset in
            guard let date = clock.calendar.date(byAdding: .day, value: -offset, to: end) else { return nil }
            let key = clock.key(date)
            return state.days[key].map { (key, $0) }
        }
    }
    var body: some View {
        let days = records
        let completed = days.reduce(0) { $0 + $1.1.completed.count }
        let planned = days.filter { !$0.1.rest }.reduce(0) { $0 + $1.1.scheduled.count }
        let minutes = days.reduce(0) { $0 + $1.1.focusMinutes }
        VStack(alignment: .leading, spacing: 16) {
            Text("Your last seven days").font(.title2.bold())
            Text("\(completed) of \(planned) small promises kept").font(.headline)
            Text("Includes today. Rest days are left out of the total.").font(.caption).foregroundStyle(.secondary)
            ForEach(days, id: \.0) { key, day in
                HStack {
                    Text(GameClock().date(key)!, format: .dateTime.weekday(.wide))
                    Spacer()
                    Text(day.rest ? "Rest" : day.scheduled.isEmpty ? "No goals planned" : "\(day.completed.count) / \(day.scheduled.count)")
                        .foregroundStyle(.secondary)
                }.font(.subheadline)
            }
            Label("\(minutes) minutes made for yourself", systemImage: "timer").font(.subheadline)
            Text(planned == 0 ? "Start with one small promise on a day that works for you." : completed == planned ? "Your routine fits this week. Keep it small enough to repeat." : "A missed goal is useful information. In Today, try making one goal smaller or moving it to fewer days.")
                .font(.subheadline).foregroundStyle(.secondary)
        }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
    }
}
