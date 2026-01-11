import { useState } from "react";

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Forgot password flow
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1=request token, 2=submit token+new password
  const [resetUsername, setResetUsername] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { username, password }
        : { username, email, password, confirmPassword };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred");
        return;
      }

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify({
        userId: data.userId,
        username: data.username,
        email: data.email
      }));

      onLoginSuccess({
        userId: data.userId,
        username: data.username,
        email: data.email
      });
    } catch (err) {
      if (err.message.includes("Failed to fetch")) {
        setError("Cannot connect to server. Make sure backend is running on port 5000");
      } else {
        setError("Network error. Please try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (e) => {
    e && e.preventDefault();
    setResetMessage("");
    setResetLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername, email: resetUsername })
      });
      const data = await response.json();
      if (!response.ok) {
        setResetMessage(data.error || 'Could not request reset');
      } else {
        setResetMessage('Reset token generated. (For dev use only)');
        // For dev convenience, show token so user can paste it
        if (data.token) setResetToken(data.token);
        setResetStep(2);
      }
    } catch (err) {
      setResetMessage('Network error.');
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  const submitReset = async (e) => {
    e && e.preventDefault();
    setResetMessage("");
    if (!resetToken || !newPassword || !confirmNewPassword) {
      setResetMessage('All fields are required');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetMessage('Passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword, confirmPassword: confirmNewPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setResetMessage(data.error || 'Could not reset password');
      } else {
        setResetMessage('Password reset successful. Please login with your new password.');
        // Reset view
        setIsResetMode(false);
        setIsLogin(true);
        setResetStep(1);
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setResetMessage('Network error.');
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="card animate login-container">
      <h2>{isLogin ? "🔐 Login" : "📝 Register"}</h2>

      {error && <div className="error-message">❌ {error}</div>}

      {!isResetMode && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="👤 Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {!isLogin && (
            <input
              type="email"
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <input
            type="password"
            placeholder="🔒 Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

            {/* Forgot password link moved here (below password input) */}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setResetStep(1);
                    setResetMessage("");
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0066cc',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

          {!isLogin && (
            <input
              type="password"
              placeholder="🔒 Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <button type="submit" className="glass-button" disabled={loading}>
            {loading ? "⏳ Please wait..." : (isLogin ? "🚀 Login" : "✅ Register")}
          </button>
        </form>
      )}

      {isResetMode && (
        <div>
          {resetStep === 1 && (
            <form onSubmit={requestReset}>
              <input
                type="text"
                placeholder="👤 Username or Email"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                required
              />
              <button className="glass-button" onClick={requestReset} disabled={resetLoading}>
                {resetLoading ? '⏳ Sending...' : '📨 Request Reset'}
              </button>
            </form>
          )}

          {resetStep === 2 && (
            <form onSubmit={submitReset}>
              <input
                type="text"
                placeholder="🔑 Reset Token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="🔒 New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="🔒 Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
              <button className="glass-button" onClick={submitReset} disabled={resetLoading}>
                {resetLoading ? '⏳ Resetting...' : '🔁 Reset Password'}
              </button>
            </form>
          )}

          {resetMessage && <div className="error-message">{resetMessage}</div>}
            </div>
          )}

      <p style={{ marginTop: "15px", fontSize: "14px" }}>
        {!isResetMode && (
          <>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setUsername("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0066cc",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "14px",
                padding: 0
              }}
            >
              {isLogin ? "Register here" : "Login here"}
            </button>
          </>
        )}

        {!isResetMode && isLogin && (
          <>
            <br />
            <button
              type="button"
              onClick={() => {
                setIsResetMode(true);
                setResetStep(1);
                setResetMessage("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0066cc",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "14px",
                padding: 0
              }}
            >
              Forgot password?
            </button>
          </>
        )}

        {isResetMode && (
          <>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setResetMessage("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0066cc",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "14px",
                padding: 0
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </p>
    </div>
  );
}
