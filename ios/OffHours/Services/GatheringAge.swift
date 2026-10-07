@preconcurrency import DeclaredAgeRange
import UIKit

/// Gatherings ask Apple for an 18+ age range on iOS 26. The answer is not stored.
/// Tonight stays available either way. On earlier systems the existing 17+ terms still apply.
enum GatheringAge {
    /// Nil when gatherings are allowed. Otherwise a sentence to show the person.
    @MainActor
    static func blockReason() async -> String? {
        guard #available(iOS 26, *) else { return nil }
        return await AgeCheck.blockReason()
    }
}

@available(iOS 26, *)
@MainActor
private enum AgeCheck {
    static func blockReason() async -> String? {
        guard let presenter = topViewController() else { return nil }
        do {
            let response = try await AgeRangeService.shared.requestAgeRange(ageGates: 18, in: presenter)
            switch response {
            case .declinedSharing:
                return "Gatherings need an age range of 18 or older. Tonight still works on its own."
            case .sharing(let range):
                if let upper = range.upperBound, upper < 18 {
                    return "Gatherings are for people 18 and older. Tonight still works on its own."
                }
                return nil
            @unknown default:
                return nil
            }
        } catch let error as AgeRangeService.Error {
            switch error {
            case .notAvailable, .invalidAccount:
                return nil
            case .declinedOnboarding:
                return "Gatherings need an age range of 18 or older. Tonight still works on its own."
            case .network, .invalidRequest:
                return "Couldn't check the age range. Try again before joining a gathering."
            @unknown default:
                return "Couldn't check the age range. Try again before joining a gathering."
            }
        } catch {
            return "Couldn't check the age range. Try again before joining a gathering."
        }
    }

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        guard let root = scene?.keyWindow?.rootViewController else { return nil }
        var controller = root
        while let presented = controller.presentedViewController {
            controller = presented
        }
        return controller
    }
}
