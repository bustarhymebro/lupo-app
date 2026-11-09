import SwiftUI

struct TrailsView: View {
    @EnvironmentObject private var store: LupoStore
    @EnvironmentObject private var membership: Membership
    @Environment(\.dismiss) private var dismiss
    @State private var selected: String?
    @State private var replacing: String?
    @State private var showingPlus = false
    @State private var note = ""
    @State private var focusStep = UUID()
    var body: some View {
        ScrollViewReader { proxy in
        Screen(title: "Guided trails", showsClose: true) {
            Text("Practical experiments for your real life. One step on the days you have room. No deadlines and no catching up.").foregroundStyle(Theme.secondaryText)
            if let progress = store.state.trail, let trail = GuidedTrail.find(progress.id) {
                VStack(alignment: .leading, spacing: 16) {
                    Label(trail.title, systemImage: trail.symbol).font(.title2.bold())
                    ProgressView(value: Double(progress.entries.count), total: Double(trail.steps.count)).tint(Theme.accent)
                    if progress.isComplete {
                        Text("You reached the end of this trail. Keep the parts that helped and leave the rest.").font(.headline)
                    } else if store.state.trailRewardDay == store.state.lastDay {
                        Label("Today's step is complete. Take the rest of the day for yourself.", systemImage: "checkmark.seal").font(.headline)
                    } else {
                        let step = trail.steps[progress.entries.count]
                        Text("Step \(progress.entries.count + 1) of \(trail.steps.count) · \(step.title)").font(.headline)
                        Text(step.action)
                        Text(step.reflection).font(.subheadline.bold())
                        TextField("Optional note, just for you", text: $note, axis: .vertical).lineLimit(3...5).textFieldStyle(.roundedBorder).accessibilityIdentifier("trail.note")
                        Text("\(note.count)/280 · Stored only on this device and in your exported backups.").font(.caption).foregroundStyle(Theme.secondaryText)
                        if trail.premium && !membership.active {
                            ActionButton(title: "Unlock this trail with Plus", icon: "sparkles") { showingPlus = true }
                        } else {
                            ActionButton(title: "I did this · earn one meal", icon: "checkmark") {
                                store.apply { try $0.completeTrailStep(note: note, premium: membership.active, at: Date()) }
                                if store.message == nil { note = "" }
                            }.disabled(note.count > 280 || store.day.rest).accessibilityIdentifier("trail.complete")
                        }
                        if store.day.rest { Text("It's a rest day. This step will be here when you return.").font(.subheadline) }
                    }
                }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24)).id("active-trail")
            }
            Text("Choose your next trail").font(.title2.bold())
            ForEach(GuidedTrail.catalog) { trail in
                VStack(alignment: .leading, spacing: 12) {
                    Label(trail.title, systemImage: trail.symbol).font(.headline)
                    Text(trail.summary).foregroundStyle(Theme.secondaryText)
                    Text("\(trail.steps.count) steps · \(trail.premium ? "Included in Plus" : "Free")").font(.caption)
                    Button(selected == trail.id ? "Hide first step" : "Preview the first step") { selected = selected == trail.id ? nil : trail.id }
                    if selected == trail.id { Text(trail.steps[0].action).font(.subheadline) }
                    Button(trail.premium && !membership.active ? "See Plus" : store.state.trail?.id == trail.id ? "Start this trail again" : "Start this trail") {
                        if trail.premium && !membership.active { showingPlus = true }
                        else if store.state.trail != nil { replacing = trail.id }
                        else { begin(trail.id) }
                    }.accessibilityIdentifier("trail.start.\(trail.id)")
                }.padding(.vertical, 12)
                Divider()
            }
            if store.state.trail?.entries.isEmpty == false || !(store.state.pastTrails ?? []).isEmpty {
                Text("Your trail notes").font(.title2.bold())
                Text("Your notes stay readable without Plus.").font(.caption).foregroundStyle(Theme.secondaryText)
                let records = (store.state.pastTrails ?? []) + (store.state.trail.map { [$0] } ?? [])
                ForEach(Array(records.enumerated().reversed()), id: \.offset) { _, progress in
                    DisclosureGroup(GuidedTrail.find(progress.id)?.title ?? "Trail") {
                        ForEach(Array(progress.entries.enumerated()), id: \.offset) { index, entry in
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Step \(index + 1) · \(entry.day)").font(.caption).foregroundStyle(Theme.secondaryText)
                                Text(GuidedTrail.find(progress.id)?.steps[index].title ?? "Small step").font(.headline)
                                Text(entry.note.isEmpty ? "Completed without a note." : entry.note).font(.subheadline)
                            }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                        }
                    }
                }
            }
            Button("Close") { dismiss() }
        }
        .sheet(isPresented: $showingPlus) { MembershipView() }
        .confirmationDialog("Start a different trail?", isPresented: Binding(get: { replacing != nil }, set: { if !$0 { replacing = nil } }), titleVisibility: .visible) {
            Button("Start trail and keep my notes") { if let replacing { begin(replacing) }; replacing = nil }
            Button("Keep current trail", role: .cancel) { replacing = nil }
        } message: { Text("Your previous steps and notes remain in your trail journal. Only one step can earn a meal each day.") }
        .onChange(of: focusStep) { _, _ in
            withAnimation { proxy.scrollTo("active-trail", anchor: .top) }
        }
        }
    }
    private func begin(_ id: String) {
        store.apply { try $0.beginTrail(id, premium: membership.active, at: Date()) }
        if store.message == nil { note = ""; focusStep = UUID() }
    }
}
