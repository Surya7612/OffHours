import CoreLocation
import SwiftUI

struct PlaceSearchView: View {
    let near: CLLocation?
    let onChoose: (Place) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [Place] = []
    @State private var suggestions: [Place] = []
    @State private var isSearching = false

    var body: some View {
        NavigationStack {
            List {
                if query.isEmpty {
                    if !suggestions.isEmpty {
                        Section("Parks near you") {
                            ForEach(suggestions) { row($0) }
                        }
                    }
                } else if isSearching && results.isEmpty {
                    ProgressView().frame(maxWidth: .infinity)
                } else if results.isEmpty {
                    ContentUnavailableView.search(text: query)
                } else {
                    ForEach(results) { row($0) }
                }
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Park, café, library…")
            .navigationTitle("Choose a place")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                guard let near else { return }
                suggestions = Array(await PlaceFinder.nearest(.park, around: near, withinKm: 3).prefix(6))
            }
            .task(id: query) {
                let text = query.trimmingCharacters(in: .whitespaces)
                guard text.count >= 2 else {
                    results = []
                    return
                }
                try? await Task.sleep(for: .milliseconds(300))
                guard !Task.isCancelled else { return }
                isSearching = true
                defer { isSearching = false }
                results = (try? await PlaceFinder.search(text, near: near)) ?? []
            }
        }
    }

    private func row(_ place: Place) -> some View {
        Button {
            onChoose(place)
            dismiss()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(place.name).foregroundStyle(.primary)
                    if !place.address.isEmpty {
                        Text(place.address).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let meters = place.distanceMeters {
                    Text(meters.formattedDistance)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
