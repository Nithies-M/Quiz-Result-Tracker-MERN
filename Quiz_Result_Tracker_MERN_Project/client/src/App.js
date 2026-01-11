import { useState, useEffect } from "react";
import QuizForm from "./components/QuizForm";
import Leaderboard from "./components/Leaderboard";
import Login from "./components/Login";
import "./App.css";

function App() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error parsing stored user:", err);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className={dark ? "app dark" : "app"}>
        <p style={{ textAlign: "center", marginTop: "50px" }}>⏳ Loading...</p>
      </div>
    );
  }

  return (
    <div className={dark ? "app dark" : "app"}>
      <header>
        <h1>🎯 Quiz Result Tracker</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {user && <span style={{ fontSize: "14px" }}>👋 {user.username}</span>}
          <button onClick={() => setDark(!dark)} className="header-btn">
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          {user && (
            <button onClick={handleLogout} className="header-btn logout-btn">
              🚪 Logout
            </button>
          )}
        </div>
      </header>

      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <QuizForm userId={user.userId} username={user.username} />
          <Leaderboard />
        </>
      )}
    </div>
  );
}

export default App;
