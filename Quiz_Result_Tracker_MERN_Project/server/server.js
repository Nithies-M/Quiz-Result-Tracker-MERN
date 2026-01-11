import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";


const app = express();
app.use(cors());
app.use(express.json());

// Try to connect to MongoDB Atlas first. If not available, we'll use a local JSON fallback.
const mongoURL = "mongodb+srv://nithiesrana07dhoni_db_user:Nithies123@cluster0.i1ki1yf.mongodb.net/?appName=Cluster0";

mongoose.connect(mongoURL, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  family: 4 // Use IPv4
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
  console.log("⚠️  Make sure IP is whitelisted in MongoDB Atlas or use local DB fallback");
});

// Mongoose schemas (used if Atlas is available)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetExpires: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

const quizSchema = new mongoose.Schema({
  userId: { type: String },
  username: String,
  subject: String,
  score: Number,
  totalQuestions: Number,
  createdAt: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", quizSchema);

// Simple password hashing (in production, use bcrypt)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Local JSON fallback path & helpers
const DATA_FILE = path.join(process.cwd(), 'server_data.json');
const defaultData = { users: [], quizzes: [] };

function loadLocalData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || JSON.stringify(defaultData));
  } catch (err) {
    console.error('Error loading local data:', err);
    return defaultData;
  }
}

function saveLocalData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving local data:', err);
  }
}

// Ensure local data file exists
loadLocalData();

// Register endpoint
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const hashedPassword = hashPassword(password);

    // Use MongoDB when available
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ $or: [{ username }, { email }] }).maxTimeMS(5000);
      if (existingUser) {
        return res.status(400).json({ error: "Username or email already exists" });
      }

      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();
      return res.json({ message: "✅ Registration successful", userId: newUser._id, username: newUser.username });
    }

    // Fallback: use local JSON file
    const data = loadLocalData();
    const exists = data.users.find(u => u.username === username || u.email === email);
    if (exists) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const newUserLocal = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUserLocal);
    saveLocalData(data);
    return res.json({ message: "✅ Registration successful (local)", userId: newUserLocal.id, username: newUserLocal.username });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

// Request password reset (generates token)
app.post('/api/auth/request-reset', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username && !email) return res.status(400).json({ error: 'Username or email is required' });

    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ $or: [{ username }, { email }] }).maxTimeMS(5000);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.resetToken = token;
      user.resetExpires = new Date(expires);
      await user.save();
      // In production send email; for dev return token
      return res.json({ message: 'Reset token generated', token });
    }

    // Local fallback
    const data = loadLocalData();
    const u = data.users.find(u => u.username === username || u.email === email);
    if (!u) return res.status(404).json({ error: 'User not found' });
    u.resetToken = token;
    u.resetExpires = expires;
    saveLocalData(data);
    return res.json({ message: 'Reset token generated (local)', token });
  } catch (err) {
    console.error('Request reset error:', err);
    res.status(500).json({ error: 'Could not generate reset token' });
  }
});

// Reset password using token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) return res.status(400).json({ error: 'Missing fields' });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });

    const hashed = hashPassword(newPassword);

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ resetToken: token, resetExpires: { $gt: new Date() } }).maxTimeMS(5000);
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
      user.password = hashed;
      user.resetToken = undefined;
      user.resetExpires = undefined;
      await user.save();
      return res.json({ message: 'Password reset successful' });
    }

    // Local fallback
    const data = loadLocalData();
    const u = data.users.find(u => u.resetToken === token && u.resetExpires && u.resetExpires > Date.now());
    if (!u) return res.status(400).json({ error: 'Invalid or expired token' });
    u.password = hashed;
    delete u.resetToken;
    delete u.resetExpires;
    saveLocalData(data);
    return res.json({ message: 'Password reset successful (local)' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const hashedPassword = hashPassword(password);

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ username }).maxTimeMS(5000);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      return res.json({ message: "✅ Login successful", userId: user._id, username: user.username, email: user.email });
    }

    // Local fallback
    const data = loadLocalData();
    const userLocal = data.users.find(u => u.username === username);
    if (!userLocal) return res.status(401).json({ error: "Invalid username or password" });
    if (userLocal.password !== hashedPassword) return res.status(401).json({ error: "Invalid username or password" });
    return res.json({ message: "✅ Login successful (local)", userId: userLocal.id, username: userLocal.username, email: userLocal.email });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

app.post("/api/quiz", async (req, res) => {
  try {
    const { userId, username, subject, score, totalQuestions } = req.body;

    if (mongoose.connection.readyState === 1) {
      const quiz = new Quiz({ userId, username, subject, score, totalQuestions });
      await quiz.save();
      return res.json({ message: "Result saved ✅" });
    }

    const data = loadLocalData();
    const newQuiz = {
      id: Date.now().toString(),
      userId: userId || null,
      username,
      subject,
      score,
      totalQuestions,
      createdAt: new Date().toISOString()
    };
    data.quizzes.push(newQuiz);
    saveLocalData(data);
    return res.json({ message: "Result saved ✅ (local)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const { subject } = req.query;
    if (mongoose.connection.readyState === 1) {
      const filter = subject ? { subject } : {};
      const top = await Quiz.find(filter)
        .sort({ score: -1, createdAt: -1 })
        .limit(10)
        .select("username subject score totalQuestions createdAt");
      return res.json(top);
    }

    const data = loadLocalData();
    let list = data.quizzes.slice();
    if (subject) list = list.filter(q => q.subject === subject);
    list.sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(list.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on https://quiz-result-tracker-mern.vercel.app");
});
// Export the app for Vercel
module.exports = app;