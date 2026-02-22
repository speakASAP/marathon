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
 * Winners list (Phase 2a). Paginated via GET /api/v1/winners.
 */
export default function Winners() {
  const [data, setData] = useState<WinnersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

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
    <div className="container">
      <h1>Финалисты</h1>
      <nav>
        <Link to="/">Главная</Link>
      </nav>
      {loading && items.length === 0 && <p>Загрузка…</p>}
      <ul>
        {items.map((w) => (
          <li key={w.id}>
            <Link to={`/winners/${w.id}`}>
              {w.name || 'Участник'} — золото: {w.gold ?? 0}, серебро: {w.silver ?? 0}, бронза: {w.bronze ?? 0}
            </Link>
          </li>
        ))}
      </ul>
      {data?.nextPage && (
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={loading}>
          Показать ещё
        </button>
      )}
    </div>
  );
}
