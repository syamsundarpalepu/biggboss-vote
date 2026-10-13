import { useEffect, useState } from 'react';
import './App.css';

function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export default function App() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [votedPolls, setVotedPolls] = useState(() =>
    JSON.parse(localStorage.getItem('votedPolls') || '[]')
  );

  const load = () =>
    fetch('/api/poll')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setMsg('Load kaaledu, malli try cheyandi'));

  useEffect(() => {
    load();
  }, []);

  if (!data) return <p className="center">Loading...</p>;
  if (!data.poll) return <p className="center">Ippudu a poll open lo ledu.</p>;

  const { poll, contestants } = data;
  const hasVoted = votedPolls.includes(poll.id);
  const total = contestants.reduce((s, c) => s + c.votes, 0);

  function markVoted() {
    const updated = [...votedPolls, poll.id];
    setVotedPolls(updated);
    localStorage.setItem('votedPolls', JSON.stringify(updated));
  }

  async function submit() {
    setLoading(true);
    setMsg('');
    try {
      const r = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          contestantId: selected,
          deviceId: getDeviceId(),
        }),
      });
      const j = await r.json();
      if (r.ok) {
        markVoted();
        setMsg('Thank you! Mee vote count ayyindi ✅');
      } else if (r.status === 409) {
        markVoted();
        setMsg(j.error);
      } else {
        setMsg(j.error || 'Edo problem vachindi');
      }
      await load();
    } catch {
      setMsg('Network problem, malli try cheyandi');
    }
    setLoading(false);
  }

  return (
    <main className="wrap">
      <header>
        <h1>Bigg Boss Telugu Vote</h1>
        <h2>{poll.title}</h2>
        <p>
          {hasVoted
            ? 'Meeru vote chesaru. Current results kinda chudandi.'
            : 'Mee favourite contestant photo meeda click chesi, kinda Vote button nokkandi.'}
        </p>
      </header>

      <div className="grid">
        {contestants.map((c) => {
          const pct = total ? Math.round((c.votes / total) * 100) : 0;
          return (
            <div
              key={c.id}
              className={'card' + (selected === c.id ? ' selected' : '')}
              onClick={() => !hasVoted && setSelected(c.id)}
            >
              <img src={c.photo_url} alt={c.name} />
              <h3>{c.name}</h3>
              <small>
                {c.age} yrs · {c.profession} · {c.hometown}
              </small>
              <p>{c.about}</p>
              {hasVoted && (
                <div className="bar">
                  <div style={{ width: pct + '%' }} />
                  <span>
                    {pct}% ({c.votes})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!hasVoted && (
        <button className="vote-btn" disabled={!selected || loading} onClick={submit}>
          {loading ? 'Submitting...' : 'Vote'}
        </button>
      )}

      {msg && <p className="center">{msg}</p>}

      <footer>Idi fan-made unofficial poll. Official Bigg Boss results tho sambandham ledu.</footer>
    </main>
  );
}