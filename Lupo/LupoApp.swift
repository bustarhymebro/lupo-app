import SwiftUI

@main
struct LupoApp: App {
    @StateObject private var appViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if appViewModel.hasCompletedOnboarding {
                    ContentView()
                        .environmentObject(appViewModel)
                } else {
                    OnboardingView()
                        .environmentObject(appViewModel)
                }
            }
            .preferredColorScheme(.dark)
            .onAppear {
                NotificationManager.shared.requestPermission()
                // Check if it's a new day and recalculate pet state
                appViewModel.checkForNewDay()
            }
        }
    }
}
