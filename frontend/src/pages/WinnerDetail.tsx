import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface MarathonReview {
  marathon: string;
  state: string;
  completed: string;
  review: string;
  thanks: string;
}

interface WinnerDetail {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  avatar: string;
  reviews: MarathonReview[];
}

/**
 * Winner detail: GET /api/v1/winners/:winnerId. Shows name, medals, reviews.
 */
export default function WinnerDetail() {
  const { winnerId } = useParams<{ winnerId: string }>();
  const [winner, setWinner] = useState<WinnerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!winnerId) return;
    setLoading(true);
    fetch(`/api/v1/winners/${encodeURIComponent(winnerId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setWinner(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [winnerId]);

  useEffect(() => {
    if (winner) {
      document.title = `Финалист: ${winner.name} — Marathon`;
    }
  }, [winner]);

  if (loading) return <div className="container"><p>Загрузка…</p></div>;
  if (!winner) {
    return (
      <div className="container">
        <p>Финалист не найден.</p>
        <Link to="/winners">← К списку финалистов</Link>
      </div>
    );
  }

  return (
    <div className="container page-winner-detail">
      <article className="card-winner-detail">
        <header className="winner-header">
          {winner.avatar && (
            <img src={winner.avatar} alt="" className="winner-avatar" width={80} height={80} />
          )}
          <h1>{winner.name}</h1>
          <div className="winner-medals">
            <span className="medal gold">🥇 {winner.gold}</span>
            <span className="medal silver">🥈 {winner.silver}</span>
            <span className="medal bronze">🥉 {winner.bronze}</span>
          </div>
        </header>
        {winner.reviews && winner.reviews.length > 0 && (
          <section className="winner-reviews">
            <h2>Отзывы по марафонам</h2>
            <ul>
              {winner.reviews.map((r, i) => (
                <li key={i} className="review-item">
                  <strong>{r.marathon}</strong>
                  {r.state && <span> — {r.state}</span>}
                  {r.completed && <span> ({r.completed})</span>}
                  {r.review && <p>{r.review}</p>}
                  {r.thanks && <p className="thanks">{r.thanks}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <p style={{ marginTop: '1.5rem' }}>
        <Link to="/winners">← К списку финалистов</Link>
      </p>
    </div>
  );
}
