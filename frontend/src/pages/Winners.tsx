import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchWinnerDetail, fetchWinnerPage, type WinnerLanguage, type WinnerPage, type WinnerSummary } from '../api/publicMarathon';
import { formatLanguageFlag, formatLanguageLabel, getMarathonLandingPath } from '../languages';

type MedalKind = 'gold' | 'silver' | 'bronze';

const medalNames: Record<MedalKind, { one: string; few: string; many: string }> = {
  gold: { one: 'золотая медаль', few: 'золотые медали', many: 'золотых медалей' },
  silver: { one: 'серебряная медаль', few: 'серебряные медали', many: 'серебряных медалей' },
  bronze: { one: 'бронзовая медаль', few: 'бронзовые медали', many: 'бронзовых медалей' },
};

function formatMedalLabel(kind: MedalKind, count: number) {
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;
  const form = lastTwo >= 11 && lastTwo <= 14 ? 'many' : last === 1 ? 'one' : last >= 2 && last <= 4 ? 'few' : 'many';
  return `${count} ${medalNames[kind][form]}`;
}

function getInitials(name?: string) {
  const parts = (name || 'Участник').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function MedalBadge({ kind, count }: { kind: MedalKind; count?: number }) {
  const value = count ?? 0;
  if (value <= 0) return null;

  return (
    <li className={`medal-badge medal-badge--${kind}`} aria-label={formatMedalLabel(kind, value)}>
      <span className="medal-badge__medal" aria-hidden="true">
        <span className="medal-badge__ribbon" />
        <span className="medal-badge__coin">{value}</span>
      </span>
      <span className="medal-badge__label">{formatMedalLabel(kind, value)}</span>
    </li>
  );
}

function WinnerLanguageFlags({ languages }: { languages?: WinnerLanguage[] }) {
  if (!languages || languages.length === 0) return null;

  return (
    <ul className="winner-language-flags" aria-label="Пройденные языковые марафоны">
      {languages.map((language) => {
        const label = formatLanguageLabel(language.code, language.title);
        const marathonPath = getMarathonLandingPath(language.code);
        const ariaLabel = `Открыть марафон: ${label}`;
        return (
          <li key={language.code}>
            {marathonPath ? (
              <Link className="winner-language-flag" to={marathonPath} title={label} aria-label={ariaLabel}>
                {formatLanguageFlag(language.code)}
              </Link>
            ) : (
              <span className="winner-language-flag" title={label} aria-label={label}>
                {formatLanguageFlag(language.code)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Winners list (Phase 2a). Paginated via GET /api/v1/winners. Legacy card grid.
 */
export default function Winners() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<WinnerPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [highlightedWinner, setHighlightedWinner] = useState<WinnerSummary | null>(null);

  useEffect(() => {
    document.title = 'Медали финалистов языковых марафонов — SpeakASAP®';
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

  const highlightedWinnerId = searchParams.get('me')?.trim() || '';
  useEffect(() => {
    let cancelled = false;
    if (!highlightedWinnerId) {
      setHighlightedWinner(null);
      return;
    }

    fetchWinnerDetail(highlightedWinnerId)
      .then((winner) => {
        if (!cancelled) setHighlightedWinner(winner);
      })
      .catch(() => {
        if (!cancelled) setHighlightedWinner(null);
      });

    return () => {
      cancelled = true;
    };
  }, [highlightedWinnerId]);

  const baseItems = data?.items || [];
  const items = highlightedWinner ? [highlightedWinner, ...baseItems.filter((w) => w.id !== highlightedWinner.id)] : baseItems;
  const hasLoadError = !loading && Boolean(loadError);
  const hasLoadedEmptyState = !loading && !loadError && baseItems.length === 0 && !highlightedWinner;

  return (
    <div className="container page-winners">
      <h1>Медали финалистов языковых марафонов</h1>
      {loading && items.length === 0 && <p>Загрузка…</p>}
      {hasLoadError && items.length === 0 && (
        <section className="profile-empty-panel" role="alert">
          <h2>Результаты финалистов временно недоступны</h2>
          <p>{loadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/faq" className="btn-profile-login">
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
            <Link to="/faq" className="btn btn-winner-link">
              Поддержка
            </Link>
          </div>
        </section>
      )}
      {highlightedWinner ? (
        <section className="winners-highlight-note" aria-label="Персональная ссылка финалиста">
          <h2>Ваш профиль финалиста</h2>
          <p>
            Этой ссылкой можно поделиться с друзьями.
          </p>
        </section>
      ) : null}
      <div className="winners-grid">
        {items.map((w) => (
          <article key={w.id} className={`card-winner${highlightedWinner?.id === w.id ? ' card-winner--highlighted' : ''}`}>
            {highlightedWinner?.id === w.id ? <span className="card-winner__highlight-label">Ваш профиль</span> : null}
            {w.avatar ? (
              <img src={w.avatar} alt="" className="card-winner__avatar" width={80} height={80} loading="lazy" />
            ) : (
              <div className="card-winner__avatar card-winner__avatar--placeholder">
                <span className="card-winner__stub">{getInitials(w.name)}</span>
              </div>
            )}
            <div className="card-winner__text">
              <p className="card-winner__name">{w.name || 'Участник'}</p>
              <WinnerLanguageFlags languages={w.languages} />
              <ul className="card-winner__medals">
                <MedalBadge kind="gold" count={w.gold} />
                <MedalBadge kind="silver" count={w.silver} />
                <MedalBadge kind="bronze" count={w.bronze} />
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
            className="btn btn-landing btn-primary"
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
