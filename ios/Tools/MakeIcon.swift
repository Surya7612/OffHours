// Renders the 1024×1024 App Store icon: `swift ios/Tools/MakeIcon.swift <output.png>`
import AppKit
import CoreGraphics

let size = 1024
let output = CommandLine.arguments.dropFirst().first ?? "AppIcon.png"

let space = CGColorSpace(name: CGColorSpace.sRGB)!
let context = CGContext(
    data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
)!

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: space, components: [r, g, b, a])!
}

let s = CGFloat(size)

// Sky: deep dusk at the top fading to ember at the horizon.
let sky = CGGradient(
    colorsSpace: space,
    colors: [color(0.18, 0.15, 0.36), color(0.45, 0.27, 0.50), color(0.93, 0.50, 0.33)] as CFArray,
    locations: [0, 0.55, 1]
)!
context.drawLinearGradient(sky, start: CGPoint(x: 0, y: s), end: CGPoint(x: 0, y: s * 0.40), options: [.drawsAfterEndLocation])

let horizon = s * 0.40

// Sun glow.
let glow = CGGradient(
    colorsSpace: space,
    colors: [color(1.0, 0.82, 0.55, 0.55), color(1.0, 0.70, 0.45, 0)] as CFArray,
    locations: [0, 1]
)!
context.drawRadialGradient(
    glow,
    startCenter: CGPoint(x: s / 2, y: horizon), startRadius: s * 0.18,
    endCenter: CGPoint(x: s / 2, y: horizon), endRadius: s * 0.46,
    options: []
)

// Setting sun, clipped at the horizon.
context.saveGState()
context.clip(to: CGRect(x: 0, y: horizon, width: s, height: s - horizon))
context.setFillColor(color(1.0, 0.91, 0.74))
let sunRadius = s * 0.20
context.fillEllipse(in: CGRect(x: s / 2 - sunRadius, y: horizon - sunRadius, width: sunRadius * 2, height: sunRadius * 2))
context.restoreGState()

// Water below the horizon.
let water = CGGradient(
    colorsSpace: space,
    colors: [color(0.33, 0.22, 0.42), color(0.16, 0.13, 0.30)] as CFArray,
    locations: [0, 1]
)!
context.saveGState()
context.clip(to: CGRect(x: 0, y: 0, width: s, height: horizon))
context.drawLinearGradient(water, start: CGPoint(x: 0, y: horizon), end: CGPoint(x: 0, y: 0), options: [])
context.restoreGState()

// Reflection lines.
context.setLineCap(.round)
context.setStrokeColor(color(1.0, 0.86, 0.66, 0.85))
let reflections: [(y: CGFloat, half: CGFloat, width: CGFloat)] = [
    (0.355, 0.17, 0.020), (0.305, 0.12, 0.017), (0.260, 0.075, 0.014), (0.220, 0.035, 0.012),
]
for line in reflections {
    context.setLineWidth(s * line.width)
    context.move(to: CGPoint(x: s / 2 - s * line.half, y: s * line.y))
    context.addLine(to: CGPoint(x: s / 2 + s * line.half, y: s * line.y))
    context.strokePath()
}

let image = context.makeImage()!
let rep = NSBitmapImageRep(cgImage: image)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
print("Wrote \(output)")
