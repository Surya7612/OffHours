import Foundation

enum AppConfig {
    static let supabaseURL: URL? = {
        guard var host = infoString("SupabaseHost"), !host.contains("your-project") else { return nil }
        for scheme in ["https:", "http:"] where host.hasPrefix(scheme) {
            host = String(host.dropFirst(scheme.count)).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        guard !host.isEmpty else { return nil }
        return URL(string: "https://\(host)")
    }()

    static let supabaseKey: String? = {
        guard let key = infoString("SupabaseAnonKey"), !key.hasPrefix("your-") else { return nil }
        return key
    }()

    static var isBackendConfigured: Bool { supabaseURL != nil && supabaseKey != nil }

    static let privacyPolicyURL = URL(string: "https://surya7612.github.io/offhours-legal/privacy/")!
    static let termsURL = URL(string: "https://surya7612.github.io/offhours-legal/terms/")!
    static let supportEmail = "connect@suryanediyadeth.com"
    /// The numeric Apple ID from App Store Connect (App Information). Until it's set, shared
    /// gatherings link to the website instead of the App Store.
    static let appStoreID = ""
    static var downloadURL: URL {
        appStoreID.isEmpty
            ? URL(string: "https://surya7612.github.io/offhours-legal/")!
            : URL(string: "https://apps.apple.com/app/id\(appStoreID)")!
    }

    private static func infoString(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
