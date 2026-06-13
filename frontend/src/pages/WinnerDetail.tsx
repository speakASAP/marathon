import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchWinnerDetail, type WinnerDetail as WinnerDetailData } from '../api/publicMarathon';

/**
 * Winner detail: GET /api/v1/winners/:winnerId. Shows name, medals, reviews.
 */
export default function WinnerDetail() {
  const { winnerId } = useParams<{ winnerId: string }>();
  const [winner, setWinner] = useState<WinnerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!winnerId) return;
    setLoading(true);
    setLoadError('');
    fetchWinnerDetail(winnerId)
      .then((data) => {
        setWinner(data);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Winner profile could not be loaded. Refresh this page, or contact support if the problem continues.');
        setLoading(false);
      });
  }, [winnerId]);

  useEffect(() => {
    if (winner) {
      document.title = `Финалист: ${winner.name} — Marathon`;
    }
  }, [winner]);

  if (loading) return <div className="container"><p>Загрузка…</p></div>;
  if (loadError) {
    return (
      <div className="container">
        <section className="profile-empty-panel" role="alert">
          <h1>Winner profile is temporarily unavailable</h1>
          <p>{loadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <Link to="/support" className="btn-profile-login">
              Contact support
            </Link>
          </div>
        </section>
        <Link to="/winners">← К списку финалистов</Link>
      </div>
    );
  }
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
