import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/** Matches API WinnerSummary: id, name, gold, silver, bronze, avatar */
interface Winner {
  id: string;
  name?: string;
  gold?: number;
  silver?: number;
  bronze?: number;
  avatar?: string;
}

interface WinnersResponse {
  items: Winner[];
  nextPage: number | null;
  total?: number;
}

/**
 * Winners list (Phase 2a). Paginated via GET /api/v1/winners. Legacy card grid.
 */
export default function Winners() {
  const [data, setData] = useState<WinnersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Финалисты языкового марафона SpeakASAP® — Marathon';
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/winners?page=${page}&limit=24`)
      .then((r) => r.json())
      .then((d: WinnersResponse) => {
        setData((prev) => ({
          ...d,
          items: prev && page > 1 ? [...(prev.items || []), ...(d.items || [])] : (d.items || []),
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  const items = data?.items || [];

  return (
    <div className="container page-winners">
      <h1>Финалисты языковых марафонов SpeakASAP®</h1>
      {loading && items.length === 0 && <p>Загрузка…</p>}
      <div className="winners-grid">
        {items.map((w) => (
          <article key={w.id} className="card-winner">
            {w.avatar ? (
              <img src={w.avatar} alt="" className="card-winner__avatar" width={80} height={80} loading="lazy" />
            ) : (
              <div className="card-winner__avatar card-winner__avatar--placeholder">
                <span className="card-winner__stub">👤</span>
              </div>
            )}
            <div className="card-winner__text">
              <p className="card-winner__name">{w.name || 'Участник'}</p>
              <ul className="card-winner__medals">
                <li>🥇 {w.gold ?? 0}</li>
                <li>🥈 {w.silver ?? 0}</li>
                <li>🥉 {w.bronze ?? 0}</li>
              </ul>
            </div>
            <div className="card-winner__actions">
              <Link to={`/winners/${w.id}`} className="btn btn-winner-link">
                Подробнее
              </Link>
            </div>
          </article>
        ))}
      </div>
      {data?.nextPage && (
        <div className="winners-load-more">
          <button
            type="button"
            className="btn btn-landing btn-green"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
          >
            {loading ? 'Загрузка…' : 'Показать ещё'}
          </button>
        </div>
      )}
    </div>
  );
}
