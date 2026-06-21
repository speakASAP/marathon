import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWinnerPage, type WinnerPage } from '../api/publicMarathon';

/**
 * Winners list (Phase 2a). Paginated via GET /api/v1/winners. Legacy card grid.
 */
export default function Winners() {
  const [data, setData] = useState<WinnerPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Финалисты Marathon — языковые марафоны SpeakASAP®';
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetchWinnerPage(page, 24)
      .then((d) => {
        setData((prev) => ({
          ...d,
          items: prev && page > 1 ? [...(prev.items || []), ...(d.items || [])] : (d.items || []),
        }));
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Результаты финалистов не загрузились. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        setLoading(false);
      });
  }, [page]);

  const items = data?.items || [];
  const hasLoadError = !loading && Boolean(loadError);
  const hasLoadedEmptyState = !loading && !loadError && items.length === 0;

  return (
    <div className="container page-winners">
      <h1>Финалисты Marathon</h1>
      {loading && items.length === 0 && <p>Загрузка…</p>}
      {hasLoadError && items.length === 0 && (
        <section className="profile-empty-panel" role="alert">
          <h2>Результаты финалистов временно недоступны</h2>
          <p>{loadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/support" className="btn-profile-login">
              Связаться с поддержкой
            </Link>
          </div>
        </section>
      )}
      {hasLoadedEmptyState && (
        <section className="winners-empty-state">
          <h2>Финалисты появятся после запуска марафона</h2>
          <p>
            Сейчас production каталог еще не загружен, поэтому победители и медали пока не сформированы.
            Как только участники завершат первые марафоны, здесь появятся их результаты.
          </p>
          <div className="winners-empty-actions">
            <Link to="/register" className="btn btn-landing navbar-cta navbar-cta-closed">
              Статус регистрации
            </Link>
            <Link to="/support" className="btn btn-winner-link">
              Поддержка
            </Link>
          </div>
        </section>
      )}
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
      {hasLoadError && items.length > 0 && (
        <section className="profile-empty-panel" role="alert">
          <h2>Дополнительные результаты финалистов не загрузились</h2>
          <p>{loadError}</p>
        </section>
      )}
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
