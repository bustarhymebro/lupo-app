import SwiftUI

struct PaywallView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @Environment(\.dismiss) var dismiss

    @State private var isPurchasing = false
    @State private var showRestoreAlert = false

    private let features: [(icon: String, title: String, description: String)] = [
        ("star.fill", "All 5 Growth Stages", "Watch your wolf grow from pup to alpha. Every stage earned, not given."),
        ("slider.horizontal.3", "Advanced Customization", "Set granular targets, adjust habits, control your own standard."),
        ("shield.fill", "Streak Protection", "One free pass per month. Because life is real — use it wisely.")
    ]

    var body: some View {
        ZStack {
            Color(hex: "0A0A0A").ignoresSafeArea()

            // Faint wolf silhouette background
            GeometryReader { geo in
                PetArtView(stage: .adultWolf, mood: .neutral, energy: 0.5, animated: false)
                    .frame(width: geo.size.width * 1.2, height: geo.size.width * 1.2)
                    .opacity(0.04)
                    .offset(x: geo.size.width * 0.05, y: geo.size.height * 0.1)
            }
            .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Close button
                    HStack {
                        Spacer()
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "555555"))
                                .padding(10)
                                .background(Color(hex: "1C1C1C"))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 16)

                    Spacer(minLength: 24)

                    // Title
                    VStack(spacing: 8) {
                        Text("UNLOCK")
                            .font(.system(size: 42, weight: .black, design: .monospaced))
                            .tracking(6)
                            .foregroundColor(.white)

                        Text("THE PACK")
                            .font(.system(size: 42, weight: .black, design: .monospaced))
                            .tracking(6)
                            .foregroundColor(Color(hex: "F5A623"))
                    }
                    .padding(.bottom, 8)

                    Text("LUPO PREMIUM")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .tracking(3)
                        .foregroundColor(Color(hex: "555555"))
                        .padding(.bottom, 36)

                    // Features
                    VStack(spacing: 12) {
                        ForEach(features, id: \.title) { feature in
                            FeatureRow(icon: feature.icon, title: feature.title, description: feature.description)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 36)

                    // Pricing section
                    VStack(spacing: 16) {
                        // Price badge
                        VStack(spacing: 4) {
                            Text("$39.99 / YEAR")
                                .font(.system(size: 28, weight: .black, design: .monospaced))
                                .foregroundColor(.white)

                            Text("≈ $3.33/month — less than one missed day's cost")
                                .font(.system(size: 11))
                                .foregroundColor(Color(hex: "555555"))
                        }
                        .padding(.bottom, 8)

                        // CTA button
                        Button(action: handlePurchase) {
                            Group {
                                if isPurchasing {
                                    HStack(spacing: 10) {
                                        ProgressView()
                                            .tint(Color(hex: "0A0A0A"))
                                        Text("PROCESSING...")
                                            .font(.system(size: 15, weight: .black, design: .monospaced))
                                            .tracking(2)
                                            .foregroundColor(Color(hex: "0A0A0A"))
                                    }
                                } else {
                                    Text("JOIN THE PACK — $39.99/YR")
                                        .font(.system(size: 15, weight: .black, design: .monospaced))
                                        .tracking(1.5)
                                        .foregroundColor(Color(hex: "0A0A0A"))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 58)
                            .background(
                                LinearGradient(
                                    colors: [Color(hex: "F5A623"), Color(hex: "D4870A")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                            .shadow(color: Color(hex: "F5A623").opacity(0.3), radius: 12, x: 0, y: 4)
                        }
                        .buttonStyle(.plain)
                        .disabled(isPurchasing)
                        .padding(.horizontal, 24)

                        // Restore
                        Button(action: handleRestore) {
                            Text("Restore Purchase")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "A0A0A0"))
                                .underline()
                        }
                        .buttonStyle(.plain)

                        // Legal
                        Text("Auto-renews annually at $39.99. Cancel anytime in Settings > Subscriptions.")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "3A3A3A"))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.top, 4)
                    }

                    Spacer(minLength: 48)
                }
            }
        }
        .alert("Restore", isPresented: $showRestoreAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("No active subscription found for this Apple ID.")
        }
    }

    private func handlePurchase() {
        // TODO: Replace with Purchases.shared.purchasePackage(...)
        // See RevenueCat setup in README.md
        isPurchasing = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isPurchasing = false
            // On success: viewModel.isPremium = true; dismiss()
        }
    }

    private func handleRestore() {
        // TODO: Replace with Purchases.shared.restorePurchases()
        showRestoreAlert = true
    }
}

// MARK: - FeatureRow

private struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "F5A623").opacity(0.1))
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .font(.system(size: 17))
                    .foregroundColor(Color(hex: "F5A623"))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)

                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "555555"))
                    .lineSpacing(3)
            }

            Spacer()
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(hex: "141414"))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color(hex: "2A2A2A"), lineWidth: 1))
        )
    }
}
