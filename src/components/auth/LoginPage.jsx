import { useState } from "react";

function DevMateMark() {
  return (
    <div className="auth-card__logo" aria-label="DevMate">
      <span className="auth-card__mark">DM</span>
      <div className="auth-logo-copy">
        <span className="auth-eyebrow">The Kinetic Ether</span>
        <h1 className="auth-card__title">DevMate</h1>
        <span className="auth-neon-line" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function commitSession(nextEmail) {
    const session = {
      email: nextEmail.trim(),
      createdAt: Date.now(),
    };

    // TODO: replace the local-only gate with real auth when the backend is available.
    await Promise.resolve(onLogin?.(session));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextEmail = email.trim();
    const nextPassword = password.trim();

    if (!nextEmail || !nextPassword) {
      setErrorMessage("Enter both email and password to continue.");
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage("");

    try {
      await commitSession(nextEmail);
    } catch {
      setErrorMessage("Login failed. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleContinueWithoutAccount() {
    setIsAuthenticating(true);
    setErrorMessage("");

    try {
      await commitSession("local-only@devmate");
    } catch {
      setErrorMessage("Unable to continue locally right now.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="ether-orb ether-orb--north" aria-hidden="true" />
      <div className="ether-orb ether-orb--south" aria-hidden="true" />

      <section className="auth-shell" aria-labelledby="auth-title">
        <div className="auth-card">
          <DevMateMark />

          <div className="auth-copy">
            <p className="auth-eyebrow">Local-first coding assistant</p>
            <h2 id="auth-title">Enter the ether.</h2>
            <p className="auth-card__subtitle">
              Sign in to unlock your local workspace, private sessions, and on-device analysis.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                className="auth-input"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="auth-label">Password</span>
              <input
                className="auth-input"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}

            <div className="auth-actions">
              <button className="auth-btn" type="submit" disabled={isAuthenticating}>
                <span className="auth-btn__content">
                  {isAuthenticating ? (
                    <>
                      <span className="auth-btn__spinner" aria-hidden="true" />
                      <span>Authenticating</span>
                    </>
                  ) : (
                    <span>Enter DevMate</span>
                  )}
                </span>
              </button>

              <button className="auth-link" type="button" onClick={handleContinueWithoutAccount} disabled={isAuthenticating}>
                Continue without account (local only)
              </button>
            </div>
          </form>

          <p className="auth-footnote">
            Your session stays on this device and expires automatically after 24 hours.
          </p>
        </div>
      </section>
    </main>
  );
}
