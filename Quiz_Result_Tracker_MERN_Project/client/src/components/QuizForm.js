import { useState } from "react";
import QuizQuestion, { questionsPool } from "./QuizQuestion";

const scoreGifs = {
  high: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
  medium: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  low: "https://media.giphy.com/media/3oEjHP8ELRNNlnlLGM/giphy.gif"
};

export default function QuizForm({ userId, username }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [subject, setSubject] = useState("");

  // Questions from selected subject
  const questions = subject ? questionsPool[subject] : [];

  const nextQuestion = () => {
    if (selected === questions[current].answer) setScore(score + 1);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setShowResult(true);
      submitScore();
    }
  };

  const submitScore = async () => {
    try {
      await fetch("http://localhost:5000/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username,
          subject,
          score,
          totalQuestions: questions.length
        })
      });
    } catch (err) {
      console.error("Error saving score:", err);
    }
  };

  const getGif = () => {
    const percent = (score / questions.length) * 100;
    if (percent >= 80) return scoreGifs.high;
    if (percent >= 50) return scoreGifs.medium;
    return scoreGifs.low;
  };

  const [gifError, setGifError] = useState(false);

  const restartQuiz = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setShowResult(false);
    setSubject("");
  };

  // Show result page
  if (showResult)
    return (
      <div className="card animate">
        <h2>🎉 Quiz Finished!</h2>
        <p>👤 Name: {username}</p>
        <p>📚 Subject: {subject}</p>
        <p>🏆 Score: {score} / {questions.length}</p>
        <p>📊 Percentage: {Math.round((score / questions.length) * 100)}%</p>
        {!gifError && (
          <img
            src={getGif()}
            alt="Reaction GIF"
            style={{ maxWidth: "100%", borderRadius: "15px", marginTop: "10px" }}
            onError={() => setGifError(true)}
          />
        )}
        {gifError && (
          <div style={{ fontSize: 48, marginTop: 10 }}>🎉</div>
        )}
        <button onClick={restartQuiz} className="glass-button">
          🔄 Restart Quiz
        </button>
      </div>
    );

  // Show initial form to enter name and select subject
  if (current === 0 && !subject)
    return (
      <div className="card animate">
        <h2>📝 Choose Subject & Start Quiz</h2>
        <p>Welcome, {username}! 👋</p>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">📚 Select Subject</option>
          <option value="Maths">Maths</option>
          <option value="Computer">Computer</option>
          <option value="Tamil">Tamil</option>
        </select>
        <button
          className="glass-button"
          disabled={!subject}
          onClick={() => setCurrent(0)}
        >
          🚀 Start Quiz
        </button>
      </div>
    );

  // Show current question
  return (
    <div className="card animate">
      <QuizQuestion
        q={questions[current]}
        selected={selected}
        setSelected={setSelected}
      />
      <button
        onClick={nextQuestion}
        className="glass-button"
        disabled={selected === null}
      >
        ➡️ Next
      </button>
      <p>
        Question {current + 1} / {questions.length}
      </p>
    </div>
  );
}
