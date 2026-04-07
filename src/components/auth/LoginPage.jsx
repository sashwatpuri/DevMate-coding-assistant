import { useState } from "react";
import "./LoginPage.css";

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
    <main className="premium-auth-container">
      <div className="glass-auth-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">DM</div>
          <h1 className="auth-brand-title">DevMate</h1>
          <p className="auth-brand-subtitle">The Kinetic Ether</p>
        </div>

        <form className="premium-auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email-input">Email</label>
            <input
              id="email-input"
              className="glass-input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              className="glass-input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="error-bubble" role="alert">
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem' }}>
            <button className="btn-primary-glow" type="submit" disabled={isAuthenticating}>
              <span className="btn-content">
                {isAuthenticating ? (
                  <>
                    <span className="spinner-icon" aria-hidden="true" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Enter Workspace</span>
                )}
              </span>
            </button>

            <button 
              className="btn-text-ghost" 
              type="button" 
              onClick={handleContinueWithoutAccount} 
              disabled={isAuthenticating}
            >
              Continue without account (local only)
            </button>
          </div>
        </form>

        <p className="auth-footnote-text">
          Targeting local-first coding assistant capabilities.<br/>
          Your session stays on this device.
        </p>
      </div>
    </main>
  );
}
