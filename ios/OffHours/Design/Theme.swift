import SwiftUI

enum Theme {
    static let ember = Color(red: 0.89, green: 0.45, blue: 0.29)
    static let dusk = Color(red: 0.24, green: 0.20, blue: 0.42)
    static let twilight = Color(red: 0.55, green: 0.33, blue: 0.53)

    static let duskGradient = LinearGradient(
        colors: [dusk, twilight, ember],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.background.secondary, in: .rect(cornerRadius: 24))
    }
}

extension View {
    func card() -> some View { modifier(CardModifier()) }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .foregroundStyle(.white)
            .background(Theme.ember.opacity(isEnabled ? 1 : 0.4), in: .capsule)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.snappy(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

/// Wraps children onto new lines like text, used for interest chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(subviews: subviews, width: proposal.width ?? .infinity)
        let height = rows.last.map { $0.y + $0.height } ?? 0
        let width = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = arrange(subviews: subviews, width: bounds.width)
        for row in rows {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: bounds.minY + row.y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
        }
    }

    private struct Row {
        var indices: [Int] = []
        var y: CGFloat = 0
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func arrange(subviews: Subviews, width: CGFloat) -> [Row] {
        var rows: [Row] = [Row()]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            var row = rows[rows.count - 1]
            let needed = row.indices.isEmpty ? size.width : row.width + spacing + size.width
            if needed > width, !row.indices.isEmpty {
                let y = row.y + row.height + spacing
                rows.append(Row(indices: [index], y: y, width: size.width, height: size.height))
                continue
            }
            row.indices.append(index)
            row.width = needed
            row.height = max(row.height, size.height)
            rows[rows.count - 1] = row
        }
        return rows
    }
}

struct InterestChip: View {
    let interest: Interest
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            // A plain HStack rather than Label: inside Form rows, Label adopts list styling and
            // its title collapses in a FlowLayout.
            HStack(spacing: 6) {
                Image(systemName: interest.symbol)
                    .imageScale(.small)
                Text(interest.rawValue)
                    .lineLimit(1)
            }
            .fixedSize()
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .foregroundStyle(isSelected ? .white : .primary)
            .background(isSelected ? AnyShapeStyle(Theme.ember) : AnyShapeStyle(.fill.tertiary), in: .capsule)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isSelected)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

struct KindBadge: View {
    let kind: Activity.Kind
    let minutes: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: kind.symbol)
            Text(kind.label)
            Text("·")
            Text("\(minutes) min")
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(kind.tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(kind.tint.opacity(0.14), in: .capsule)
    }
}
