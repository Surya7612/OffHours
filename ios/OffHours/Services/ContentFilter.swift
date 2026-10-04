import Foundation

/// First-line filter for gathering titles and descriptions (App Store guideline 1.2). Reports,
/// blocking and manual review in Supabase handle anything that gets past it.
enum ContentFilter {
    private static let blockedTerms: [String] = [
        "fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "retard", "whore", "slut",
        "porn", "nude", "nudes", "escort", "onlyfans", "hookup", "cocaine", "meth", "heroin",
        "crypto giveaway", "telegram me", "whatsapp me", "cashapp", "venmo me",
    ]

    static func problem(in text: String) -> String? {
        let normalized = text.lowercased()
            .folding(options: [.diacriticInsensitive, .widthInsensitive], locale: .current)
        let words = Set(normalized.split { !$0.isLetter }.map(String.init))
        for term in blockedTerms {
            let hit = term.contains(" ") ? normalized.contains(term) : words.contains(term)
            if hit {
                return "Please keep gatherings friendly and free of offensive, sexual or commercial content."
            }
        }
        if normalized.contains("http://") || normalized.contains("https://") || normalized.contains("www.") {
            return "Links aren't allowed in gatherings. Describe the plan in your own words."
        }
        return nil
    }
}

extension String {
    /// Length as Postgres `char_length` counts it (code points), which the database limits use.
    var databaseLength: Int { unicodeScalars.count }

    /// The longest prefix of whole characters within `limit` code points.
    func clipped(to limit: Int) -> String {
        var result = ""
        var length = 0
        for character in self {
            length += character.unicodeScalars.count
            guard length <= limit else { break }
            result.append(character)
        }
        return result
    }
}
