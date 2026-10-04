import CryptoKit
import Foundation

/// Sign in with Apple embeds the SHA-256 of this nonce in the ID token; Supabase checks the
/// raw value against it to stop replayed tokens.
struct AppleSignInNonce {
    let raw: String

    init() {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generator = SystemRandomNumberGenerator()
        raw = String((0..<32).map { _ in charset.randomElement(using: &generator)! })
    }

    var hashed: String {
        SHA256.hash(data: Data(raw.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
