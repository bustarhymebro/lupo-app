import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @State private var selectedTab: Int = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // Tab content
            TabView(selection: $selectedTab) {
                HomeView()
                    .tag(0)
                    .environmentObject(viewModel)

                HabitsView()
                    .tag(1)
                    .environmentObject(viewModel)

                StatsView()
                    .tag(2)
                    .environmentObject(viewModel)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea(edges: .bottom)

            // Custom tab bar
            CustomTabBar(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(edges: .bottom)
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("switchToHabitsTab"))) { _ in
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = 1
            }
        }
    }
}

// MARK: - CustomTabBar

struct CustomTabBar: View {
    @Binding var selectedTab: Int

    private struct TabItem {
        let tag: Int
        let icon: String
        let selectedIcon: String
        let label: String
    }

    private let tabs: [TabItem] = [
        TabItem(tag: 0, icon: "house",             selectedIcon: "house.fill",             label: "HOME"),
        TabItem(tag: 1, icon: "checkmark.circle",  selectedIcon: "checkmark.circle.fill",  label: "HABITS"),
        TabItem(tag: 2, icon: "chart.bar",          selectedIcon: "chart.bar.fill",          label: "STATS")
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.tag) { tab in
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = tab.tag
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: selectedTab == tab.tag ? tab.selectedIcon : tab.icon)
                            .font(.system(size: 20, weight: selectedTab == tab.tag ? .semibold : .regular))
                            .foregroundColor(selectedTab == tab.tag ? Color(hex: "F5A623") : Color(hex: "555555"))
                            .scaleEffect(selectedTab == tab.tag ? 1.1 : 1.0)
                            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: selectedTab)

                        Text(tab.label)
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .tracking(0.8)
                            .foregroundColor(selectedTab == tab.tag ? Color(hex: "F5A623") : Color(hex: "555555"))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 24)
        .background(
            ZStack {
                Color(hex: "0A0A0A")
                Rectangle()
                    .fill(Color(hex: "2A2A2A"))
                    .frame(height: 1)
                    .frame(maxHeight: .infinity, alignment: .top)
            }
        )
    }
}
