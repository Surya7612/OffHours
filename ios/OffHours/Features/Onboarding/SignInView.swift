import AuthenticationServices
import SwiftUI

struct SignInView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.colorScheme) private var colorScheme
    @State private var nonce = AppleSignInNonce()
    @State private var isSigningIn = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Theme.duskGradient.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                Spacer()

                Image(systemName: "sun.horizon.fill")
                    .font(.system(size: 52))
                    .symbolRenderingMode(.hierarchical)
                    .padding(.bottom, 24)

                Text("OffHours")
                    .font(.system(.largeTitle, design: .serif, weight: .semibold))
                Text("Reclaim the hour after work.")
                    .font(.title3)
                    .opacity(0.9)
                    .padding(.top, 4)

                VStack(alignment: .leading, spacing: 14) {
                    Feature(symbol: "bell", text: "One small, phone-free idea each evening")
                    Feature(symbol: "mappin.and.ellipse", text: "Real places near you to do it")
                    Feature(symbol: "person.3", text: "Small gatherings with neighbors")
                }
                .padding(.top, 36)

                Spacer()

                SignInWithAppleButton(.continue) { request in
                    nonce = AppleSignInNonce()
                    request.requestedScopes = [.fullName, .email]
                    request.nonce = nonce.hashed
                } onCompletion: { result in
                    handle(result)
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 54)
                .clipShape(.capsule)
                .disabled(isSigningIn)
                .overlay {
                    if isSigningIn { ProgressView().tint(.black) }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .padding(.top, 12)
                }

                Text("By continuing you agree to the [Terms](\(AppConfig.termsURL.absoluteString)) and [Privacy Policy](\(AppConfig.privacyPolicyURL.absoluteString)).")
                    .font(.footnote)
                    .tint(.white)
                    .opacity(0.8)
                    .padding(.top, 16)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
            }
            .foregroundStyle(.white)
            .padding(28)
        }
    }

    private func handle(_ result: Result<ASAuthorization, any Error>) {
        switch result {
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                errorMessage = "Sign in with Apple didn't complete. Please try again."
            }
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8)
            else {
                errorMessage = "Apple didn't return a sign-in token. Please try again."
                return
            }
            let rawNonce = nonce.raw
            isSigningIn = true
            errorMessage = nil
            Task {
                defer { isSigningIn = false }
                do {
                    try await model.signInWithApple(idToken: idToken, nonce: rawNonce, fullName: credential.fullName)
                } catch {
                    errorMessage = error.userMessage
                }
            }
        }
    }
}

private struct Feature: View {
    let symbol: String
    let text: String

    var body: some View {
        Label {
            Text(text)
        } icon: {
            Image(systemName: symbol)
                .frame(width: 28)
        }
        .font(.body.weight(.medium))
    }
}
