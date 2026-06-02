import SwiftUI

struct PetArtView: View {
    let stage: PetStage
    let mood: PetMood
    let energy: Double
    var animated: Bool = true

    @State private var breathScale: CGFloat = 1.0
    @State private var droopOffset: CGFloat = 0.0

    private var stageScale: CGFloat {
        switch stage {
        case .newbornPup:  return 0.30
        case .youngPup:    return 0.50
        case .adolescent:  return 0.65
        case .subAdult:    return 0.80
        case .adultWolf:   return 1.00
        }
    }

    private var wolfColor: Color {
        // Lerp from dark gray to white as stage increases
        let t = Double(stage.rawValue) / Double(PetStage.allCases.count - 1)
        let from = 0x55.asDouble
        let to   = 0xFF.asDouble
        let val  = from + (to - from) * t
        let normalized = val / 255.0
        return Color(red: normalized, green: normalized, blue: normalized)
    }

    private var isSad: Bool {
        mood == .disappointed || mood == .struggling
    }

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            Canvas { context, canvasSize in
                let scale = stageScale * min(canvasSize.width, canvasSize.height) / 300.0
                let cx = canvasSize.width / 2
                let cy = canvasSize.height / 2

                drawWolf(
                    context: context,
                    cx: cx,
                    cy: cy + droopOffset,
                    scale: scale,
                    color: wolfColor,
                    stage: stage
                )
            }
            .scaleEffect(animated ? breathScale : 1.0)
            .animation(
                animated ? .easeInOut(duration: 3.0).repeatForever(autoreverses: true) : .default,
                value: breathScale
            )
            .animation(
                animated ? .easeInOut(duration: 1.5).repeatForever(autoreverses: true) : .default,
                value: droopOffset
            )
            .frame(width: size, height: size)
        }
        .onAppear {
            if animated {
                breathScale = 1.02
                droopOffset = isSad ? 6.0 : 0.0
            }
        }
        .onChange(of: mood) { newMood in
            droopOffset = (newMood == .disappointed || newMood == .struggling) ? 6.0 : 0.0
        }
    }

    // MARK: - Drawing

    private func drawWolf(
        context: GraphicsContext,
        cx: CGFloat,
        cy: CGFloat,
        scale: CGFloat,
        color: Color,
        stage: PetStage
    ) {
        switch stage {
        case .newbornPup:
            drawNewbornPup(context: context, cx: cx, cy: cy, scale: scale, color: color)
        case .youngPup:
            drawYoungPup(context: context, cx: cx, cy: cy, scale: scale, color: color)
        case .adolescent:
            drawAdolescent(context: context, cx: cx, cy: cy, scale: scale, color: color)
        case .subAdult:
            drawSubAdult(context: context, cx: cx, cy: cy, scale: scale, color: color)
        case .adultWolf:
            drawAdultWolf(context: context, cx: cx, cy: cy, scale: scale, color: color)
        }
    }

    // Stage 0: tiny round pup shape — huddled, small, circular
    private func drawNewbornPup(context: GraphicsContext, cx: CGFloat, cy: CGFloat, scale: CGFloat, color: Color) {
        var ctx = context

        // Body — round blob
        let bodyRect = CGRect(x: cx - 55 * scale, y: cy - 30 * scale, width: 110 * scale, height: 75 * scale)
        var bodyPath = Path(ellipseIn: bodyRect)
        ctx.fill(bodyPath, with: .color(color))

        // Head — large circle on top-right
        let headRect = CGRect(x: cx + 10 * scale, y: cy - 65 * scale, width: 60 * scale, height: 60 * scale)
        var headPath = Path(ellipseIn: headRect)
        ctx.fill(headPath, with: .color(color))

        // Tiny ears — two small triangles
        var leftEar = Path()
        leftEar.move(to: CGPoint(x: cx + 16 * scale, y: cy - 58 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 8 * scale, y: cy - 80 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 28 * scale, y: cy - 73 * scale))
        leftEar.closeSubpath()
        ctx.fill(leftEar, with: .color(color))

        var rightEar = Path()
        rightEar.move(to: CGPoint(x: cx + 50 * scale, y: cy - 58 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 58 * scale, y: cy - 80 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 70 * scale, y: cy - 65 * scale))
        rightEar.closeSubpath()
        ctx.fill(rightEar, with: .color(color))

        // Curled tail — small arc
        var tail = Path()
        tail.addArc(
            center: CGPoint(x: cx - 45 * scale, y: cy + 20 * scale),
            radius: 25 * scale,
            startAngle: .degrees(0),
            endAngle: .degrees(180),
            clockwise: false
        )
        ctx.stroke(tail, with: .color(color), lineWidth: 7 * scale)

        // Tiny snout bump
        let snoutRect = CGRect(x: cx + 58 * scale, y: cy - 45 * scale, width: 18 * scale, height: 14 * scale)
        ctx.fill(Path(ellipseIn: snoutRect), with: .color(color.opacity(0.85)))

        // Eyes — two tiny dots
        let eyeColor = Color(hex: "1A1A1A")
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 28 * scale, y: cy - 53 * scale, width: 6 * scale, height: 6 * scale)), with: .color(eyeColor))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 46 * scale, y: cy - 53 * scale, width: 6 * scale, height: 6 * scale)), with: .color(eyeColor))
    }

    // Stage 1: small pup with defined ears and snout
    private func drawYoungPup(context: GraphicsContext, cx: CGFloat, cy: CGFloat, scale: CGFloat, color: Color) {
        var ctx = context

        // Body — elongating slightly
        let bodyRect = CGRect(x: cx - 65 * scale, y: cy - 20 * scale, width: 130 * scale, height: 70 * scale)
        ctx.fill(Path(ellipseIn: bodyRect), with: .color(color))

        // Legs — front two
        drawLeg(context: &ctx, x: cx - 30 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 16, height: 30)
        drawLeg(context: &ctx, x: cx - 5 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 16, height: 30)

        // Head
        let headRect = CGRect(x: cx + 25 * scale, y: cy - 68 * scale, width: 70 * scale, height: 65 * scale)
        ctx.fill(Path(ellipseIn: headRect), with: .color(color))

        // Neck
        let neckRect = CGRect(x: cx + 30 * scale, y: cy - 28 * scale, width: 40 * scale, height: 30 * scale)
        ctx.fill(Path(ellipseIn: neckRect), with: .color(color))

        // Ears — sharper
        var leftEar = Path()
        leftEar.move(to: CGPoint(x: cx + 30 * scale, y: cy - 60 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 18 * scale, y: cy - 92 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 44 * scale, y: cy - 82 * scale))
        leftEar.closeSubpath()
        ctx.fill(leftEar, with: .color(color))

        var rightEar = Path()
        rightEar.move(to: CGPoint(x: cx + 72 * scale, y: cy - 60 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 84 * scale, y: cy - 90 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 92 * scale, y: cy - 65 * scale))
        rightEar.closeSubpath()
        ctx.fill(rightEar, with: .color(color))

        // Snout — defined muzzle
        let snoutRect = CGRect(x: cx + 78 * scale, y: cy - 52 * scale, width: 28 * scale, height: 20 * scale)
        ctx.fill(Path(ellipseIn: snoutRect), with: .color(color.opacity(0.8)))

        // Nose
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 96 * scale, y: cy - 54 * scale, width: 10 * scale, height: 8 * scale)), with: .color(Color(hex: "111111")))

        // Eyes
        let eyeColor = Color(hex: "1A1A1A")
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 44 * scale, y: cy - 52 * scale, width: 9 * scale, height: 9 * scale)), with: .color(eyeColor))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 65 * scale, y: cy - 52 * scale, width: 9 * scale, height: 9 * scale)), with: .color(eyeColor))

        // Tail up
        var tail = Path()
        tail.move(to: CGPoint(x: cx - 60 * scale, y: cy))
        tail.addQuadCurve(to: CGPoint(x: cx - 85 * scale, y: cy - 50 * scale), control: CGPoint(x: cx - 90 * scale, y: cy - 10 * scale))
        ctx.stroke(tail, with: .color(color), lineWidth: 10 * scale)
    }

    // Stage 2: adolescent — leaner, taller, side profile
    private func drawAdolescent(context: GraphicsContext, cx: CGFloat, cy: CGFloat, scale: CGFloat, color: Color) {
        var ctx = context

        // Body — leaner, longer
        let bodyRect = CGRect(x: cx - 75 * scale, y: cy - 25 * scale, width: 150 * scale, height: 62 * scale)
        ctx.fill(Path(ellipseIn: bodyRect), with: .color(color))

        // Chest bump
        let chestRect = CGRect(x: cx + 40 * scale, y: cy - 35 * scale, width: 50 * scale, height: 50 * scale)
        ctx.fill(Path(ellipseIn: chestRect), with: .color(color))

        // Four legs
        drawLeg(context: &ctx, x: cx - 45 * scale, y: cy + 30 * scale, scale: scale, color: color, width: 14, height: 40)
        drawLeg(context: &ctx, x: cx - 20 * scale, y: cy + 30 * scale, scale: scale, color: color, width: 14, height: 40)
        drawLeg(context: &ctx, x: cx + 52 * scale, y: cy + 30 * scale, scale: scale, color: color, width: 14, height: 40)
        drawLeg(context: &ctx, x: cx + 72 * scale, y: cy + 30 * scale, scale: scale, color: color, width: 14, height: 40)

        // Head — more defined
        let headRect = CGRect(x: cx + 52 * scale, y: cy - 80 * scale, width: 78 * scale, height: 70 * scale)
        ctx.fill(Path(ellipseIn: headRect), with: .color(color))

        // Neck
        let neckRect = CGRect(x: cx + 55 * scale, y: cy - 38 * scale, width: 44 * scale, height: 32 * scale)
        ctx.fill(Path(ellipseIn: neckRect), with: .color(color))

        // Ears
        var leftEar = Path()
        leftEar.move(to: CGPoint(x: cx + 58 * scale, y: cy - 72 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 46 * scale, y: cy - 108 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 72 * scale, y: cy - 96 * scale))
        leftEar.closeSubpath()
        ctx.fill(leftEar, with: .color(color))

        var rightEar = Path()
        rightEar.move(to: CGPoint(x: cx + 100 * scale, y: cy - 72 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 112 * scale, y: cy - 108 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 126 * scale, y: cy - 88 * scale))
        rightEar.closeSubpath()
        ctx.fill(rightEar, with: .color(color))

        // Snout / muzzle
        let snoutRect = CGRect(x: cx + 110 * scale, y: cy - 63 * scale, width: 36 * scale, height: 24 * scale)
        ctx.fill(Path(ellipseIn: snoutRect), with: .color(color.opacity(0.78)))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 132 * scale, y: cy - 65 * scale, width: 12 * scale, height: 10 * scale)), with: .color(Color(hex: "111111")))

        // Eyes — amber glow hint
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 72 * scale, y: cy - 62 * scale, width: 11 * scale, height: 11 * scale)), with: .color(Color(hex: "F5A623").opacity(0.4)))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 72 * scale, y: cy - 62 * scale, width: 7 * scale, height: 7 * scale)), with: .color(Color(hex: "1A1A1A")))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 96 * scale, y: cy - 62 * scale, width: 11 * scale, height: 11 * scale)), with: .color(Color(hex: "F5A623").opacity(0.4)))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 96 * scale, y: cy - 62 * scale, width: 7 * scale, height: 7 * scale)), with: .color(Color(hex: "1A1A1A")))

        // Tail
        var tail = Path()
        tail.move(to: CGPoint(x: cx - 70 * scale, y: cy + 10 * scale))
        tail.addQuadCurve(to: CGPoint(x: cx - 105 * scale, y: cy - 45 * scale), control: CGPoint(x: cx - 110 * scale, y: cy + 5 * scale))
        ctx.stroke(tail, with: .color(color), lineWidth: 12 * scale)
    }

    // Stage 3: sub-adult — powerful stance, strong lines
    private func drawSubAdult(context: GraphicsContext, cx: CGFloat, cy: CGFloat, scale: CGFloat, color: Color) {
        var ctx = context

        // Body — broader, muscular
        let bodyRect = CGRect(x: cx - 85 * scale, y: cy - 30 * scale, width: 165 * scale, height: 68 * scale)
        ctx.fill(Path(ellipseIn: bodyRect), with: .color(color))

        // Chest — strong
        let chestRect = CGRect(x: cx + 42 * scale, y: cy - 48 * scale, width: 60 * scale, height: 60 * scale)
        ctx.fill(Path(ellipseIn: chestRect), with: .color(color))

        // Haunches
        let haunchRect = CGRect(x: cx - 85 * scale, y: cy - 20 * scale, width: 55 * scale, height: 55 * scale)
        ctx.fill(Path(ellipseIn: haunchRect), with: .color(color))

        // Legs
        drawLeg(context: &ctx, x: cx - 60 * scale, y: cy + 34 * scale, scale: scale, color: color, width: 17, height: 50)
        drawLeg(context: &ctx, x: cx - 30 * scale, y: cy + 34 * scale, scale: scale, color: color, width: 17, height: 50)
        drawLeg(context: &ctx, x: cx + 60 * scale, y: cy + 34 * scale, scale: scale, color: color, width: 17, height: 50)
        drawLeg(context: &ctx, x: cx + 85 * scale, y: cy + 34 * scale, scale: scale, color: color, width: 17, height: 50)

        // Head — regal
        let headRect = CGRect(x: cx + 60 * scale, y: cy - 95 * scale, width: 90 * scale, height: 80 * scale)
        ctx.fill(Path(ellipseIn: headRect), with: .color(color))

        // Neck — thick
        let neckRect = CGRect(x: cx + 60 * scale, y: cy - 52 * scale, width: 52 * scale, height: 38 * scale)
        ctx.fill(Path(ellipseIn: neckRect), with: .color(color))

        // Ears — sharp
        var leftEar = Path()
        leftEar.move(to: CGPoint(x: cx + 66 * scale, y: cy - 86 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 50 * scale, y: cy - 130 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 82 * scale, y: cy - 115 * scale))
        leftEar.closeSubpath()
        ctx.fill(leftEar, with: .color(color))

        var rightEar = Path()
        rightEar.move(to: CGPoint(x: cx + 118 * scale, y: cy - 86 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 132 * scale, y: cy - 128 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 148 * scale, y: cy - 104 * scale))
        rightEar.closeSubpath()
        ctx.fill(rightEar, with: .color(color))

        // Snout
        let snoutRect = CGRect(x: cx + 128 * scale, y: cy - 74 * scale, width: 40 * scale, height: 28 * scale)
        ctx.fill(Path(ellipseIn: snoutRect), with: .color(color.opacity(0.75)))
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 154 * scale, y: cy - 76 * scale, width: 14 * scale, height: 11 * scale)), with: .color(Color(hex: "0D0D0D")))

        // Eyes — amber
        for ex in [cx + 84 * scale, cx + 112 * scale] {
            ctx.fill(Path(ellipseIn: CGRect(x: ex - 7 * scale, y: cy - 76 * scale, width: 14 * scale, height: 14 * scale)), with: .color(Color(hex: "F5A623").opacity(0.6)))
            ctx.fill(Path(ellipseIn: CGRect(x: ex - 5 * scale, y: cy - 74 * scale, width: 9 * scale, height: 9 * scale)), with: .color(Color(hex: "0D0D0D")))
        }

        // Tail — raised and proud
        var tail = Path()
        tail.move(to: CGPoint(x: cx - 80 * scale, y: cy))
        tail.addCurve(
            to: CGPoint(x: cx - 120 * scale, y: cy - 75 * scale),
            control1: CGPoint(x: cx - 120 * scale, y: cy + 10 * scale),
            control2: CGPoint(x: cx - 140 * scale, y: cy - 40 * scale)
        )
        ctx.stroke(tail, with: .color(color), lineWidth: 14 * scale)
    }

    // Stage 4: adult wolf — full majestic silhouette, standing tall
    private func drawAdultWolf(context: GraphicsContext, cx: CGFloat, cy: CGFloat, scale: CGFloat, color: Color) {
        var ctx = context

        // Main body — powerful
        let bodyRect = CGRect(x: cx - 100 * scale, y: cy - 35 * scale, width: 185 * scale, height: 75 * scale)
        ctx.fill(Path(ellipseIn: bodyRect), with: .color(color))

        // Broad chest
        let chestRect = CGRect(x: cx + 42 * scale, y: cy - 58 * scale, width: 72 * scale, height: 72 * scale)
        ctx.fill(Path(ellipseIn: chestRect), with: .color(color))

        // Muscular haunches
        let haunchRect = CGRect(x: cx - 100 * scale, y: cy - 28 * scale, width: 68 * scale, height: 66 * scale)
        ctx.fill(Path(ellipseIn: haunchRect), with: .color(color))

        // Legs — all four, defined
        drawLeg(context: &ctx, x: cx - 70 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 19, height: 58)
        drawLeg(context: &ctx, x: cx - 38 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 19, height: 58)
        drawLeg(context: &ctx, x: cx + 68 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 19, height: 58)
        drawLeg(context: &ctx, x: cx + 96 * scale, y: cy + 38 * scale, scale: scale, color: color, width: 19, height: 58)

        // Neck — powerful
        let neckRect = CGRect(x: cx + 68 * scale, y: cy - 62 * scale, width: 58 * scale, height: 46 * scale)
        ctx.fill(Path(ellipseIn: neckRect), with: .color(color))

        // Head — regal and large
        let headRect = CGRect(x: cx + 68 * scale, y: cy - 118 * scale, width: 105 * scale, height: 92 * scale)
        ctx.fill(Path(ellipseIn: headRect), with: .color(color))

        // Mane / ruff at neck
        let maneRect = CGRect(x: cx + 58 * scale, y: cy - 80 * scale, width: 80 * scale, height: 50 * scale)
        ctx.fill(Path(ellipseIn: maneRect), with: .color(color.opacity(0.6)))

        // Ears — tall and sharp
        var leftEar = Path()
        leftEar.move(to: CGPoint(x: cx + 74 * scale, y: cy - 105 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 54 * scale, y: cy - 158 * scale))
        leftEar.addLine(to: CGPoint(x: cx + 90 * scale, y: cy - 140 * scale))
        leftEar.closeSubpath()
        ctx.fill(leftEar, with: .color(color))

        var rightEar = Path()
        rightEar.move(to: CGPoint(x: cx + 136 * scale, y: cy - 105 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 154 * scale, y: cy - 156 * scale))
        rightEar.addLine(to: CGPoint(x: cx + 172 * scale, y: cy - 128 * scale))
        rightEar.closeSubpath()
        ctx.fill(rightEar, with: .color(color))

        // Inner ear detail
        var innerEar = Path()
        innerEar.move(to: CGPoint(x: cx + 78 * scale, y: cy - 108 * scale))
        innerEar.addLine(to: CGPoint(x: cx + 62 * scale, y: cy - 148 * scale))
        innerEar.addLine(to: CGPoint(x: cx + 88 * scale, y: cy - 136 * scale))
        innerEar.closeSubpath()
        ctx.fill(innerEar, with: .color(Color(hex: "3A1A1A").opacity(0.5)))

        // Snout — strong muzzle
        let snoutRect = CGRect(x: cx + 148 * scale, y: cy - 96 * scale, width: 46 * scale, height: 32 * scale)
        ctx.fill(Path(ellipseIn: snoutRect), with: .color(color.opacity(0.72)))

        // Nose — black
        ctx.fill(Path(ellipseIn: CGRect(x: cx + 178 * scale, y: cy - 98 * scale, width: 16 * scale, height: 13 * scale)), with: .color(Color(hex: "080808")))

        // Eyes — bright amber, wolf stare
        for ex in [cx + 98 * scale, cx + 132 * scale] {
            // Glow ring
            ctx.fill(Path(ellipseIn: CGRect(x: ex - 10 * scale, y: cy - 98 * scale, width: 18 * scale, height: 18 * scale)), with: .color(Color(hex: "F5A623").opacity(0.7)))
            // Iris
            ctx.fill(Path(ellipseIn: CGRect(x: ex - 8 * scale, y: cy - 96 * scale, width: 14 * scale, height: 14 * scale)), with: .color(Color(hex: "D4870A")))
            // Pupil
            ctx.fill(Path(ellipseIn: CGRect(x: ex - 5 * scale, y: cy - 93 * scale, width: 8 * scale, height: 8 * scale)), with: .color(Color(hex: "060606")))
        }

        // Tail — majestic arc
        var tail = Path()
        tail.move(to: CGPoint(x: cx - 95 * scale, y: cy + 5 * scale))
        tail.addCurve(
            to: CGPoint(x: cx - 138 * scale, y: cy - 88 * scale),
            control1: CGPoint(x: cx - 145 * scale, y: cy + 15 * scale),
            control2: CGPoint(x: cx - 160 * scale, y: cy - 45 * scale)
        )
        // Tail tip flare
        tail.addLine(to: CGPoint(x: cx - 148 * scale, y: cy - 95 * scale))
        ctx.stroke(tail, with: .color(color), lineWidth: 16 * scale)

        // Tail fur tip
        ctx.fill(Path(ellipseIn: CGRect(x: cx - 154 * scale, y: cy - 102 * scale, width: 20 * scale, height: 20 * scale)), with: .color(color))
    }

    // MARK: - Shared Helpers

    private func drawLeg(
        context: inout GraphicsContext,
        x: CGFloat, y: CGFloat,
        scale: CGFloat,
        color: Color,
        width: CGFloat,
        height: CGFloat
    ) {
        let rect = CGRect(x: x - width / 2 * scale, y: y, width: width * scale, height: height * scale)
        var path = Path(roundedRect: rect, cornerRadius: width / 2 * scale)
        context.fill(path, with: .color(color))
        // Paw
        let pawRect = CGRect(x: x - (width / 2 + 1) * scale, y: y + (height - 4) * scale, width: (width + 2) * scale, height: 8 * scale)
        context.fill(Path(ellipseIn: pawRect), with: .color(color))
    }
}

// MARK: - Helper

private extension Int {
    var asDouble: Double { Double(self) }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 16) {
        ForEach(PetStage.allCases, id: \.rawValue) { stage in
            VStack {
                PetArtView(stage: stage, mood: .thriving, energy: 0.8)
                    .frame(width: 80, height: 80)
                Text(stage.displayName)
                    .font(.caption2)
                    .foregroundColor(.white)
            }
        }
    }
    .padding()
    .background(Color(hex: "0A0A0A"))
}
