import { useEffect, useState } from "react";

export default function Leaderboard(props) {
  const [data, setData] = useState([]);
  const [subject, setSubject] = useState("");

  useEffect(() => {
    fetch(`https://quiz-result-tracker-mern.vercel.app/api/leaderboard?subject=${subject}`)
      .then(res => res.json())
      .then(result => {
        if (Array.isArray(result)) {
          setData(result);
        } else {
          setData([]);
        }
      })
      .catch(err => {
        console.error("Error fetching leaderboard:", err);
        setData([]);
      });
  }, [subject]);

  return (
    <div className="card animate">
      <h2>🏆 Top 10 Leaderboard</h2>

      <select value={subject} onChange={e => setSubject(e.target.value)}>
        <option value="">🌍 All Subjects</option>
        <option value="Maths">Maths</option>
        <option value="Computer">Computer</option>
        <option value="Tamil">Tamil</option>
      </select>

      <ul className="leaderboard">
        {data.length > 0 ? (
          data.map((d, i) => (
            <li key={i}>
              <span style={{ marginRight: 10 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"}</span>
              <strong style={{ marginRight: 8 }}>{d.username || d.name || 'Anonymous'}</strong>
              <span style={{ color: '#666', marginRight: 8 }}>|</span>
              <span style={{ marginRight: 8 }}>{d.subject || '—'}</span>
              <span style={{ color: '#666' }}>| {d.score ?? 0}</span>
            </li>
          ))
        ) : (
          <li>📊 No scores yet. Take a quiz to appear on the leaderboard!</li>
        )}
      </ul>
    </div>
  );
}
