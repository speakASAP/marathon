import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchWinnerDetail, type WinnerLanguage, type WinnerDetail as WinnerDetailData } from '../api/publicMarathon';
import { formatLanguageFlag, formatLanguageLabel } from '../languages';

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

function MedalBadge({ kind, count }: { kind: MedalKind; count: number }) {
  return (
    <span className={`medal-badge medal-badge--${kind}`} aria-label={formatMedalLabel(kind, count)}>
      <span className="medal-badge__medal" aria-hidden="true">
        <span className="medal-badge__ribbon" />
        <span className="medal-badge__coin">{count}</span>
      </span>
      <span className="medal-badge__label">{formatMedalLabel(kind, count)}</span>
    </span>
  );
}

function WinnerLanguageFlags({ languages }: { languages?: WinnerLanguage[] }) {
  if (!languages || languages.length === 0) return null;

  return (
    <ul className="winner-language-flags winner-language-flags--detail" aria-label="Пройденные языковые марафоны">
      {languages.map((language) => {
        const label = formatLanguageLabel(language.code, language.title);
        return (
          <li key={language.code}>
            <span className="winner-language-flag" title={label} aria-label={label}>
              {formatLanguageFlag(language.code)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

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
        setLoadError('Профиль финалиста не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        setLoading(false);
      });
  }, [winnerId]);

  useEffect(() => {
    if (winner) {
      document.title = `Финалист: ${winner.name} — Марафон`;
    }
  }, [winner]);

  if (loading) return <div className="container"><p>Загрузка…</p></div>;
  if (loadError) {
    return (
      <div className="container">
          <section className="profile-empty-panel" role="alert">
            <h1>Профиль финалиста временно недоступен</h1>
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
            {winner.avatar ? (
              <img src={winner.avatar} alt="" className="winner-avatar" width={112} height={112} />
            ) : (
              <div className="winner-avatar winner-avatar--placeholder">
                <span>{getInitials(winner.name)}</span>
              </div>
            )}
            <div className="winner-header__copy">
              <h1>{winner.name}</h1>
              <WinnerLanguageFlags languages={winner.languages} />
              <div className="winner-medals">
                <MedalBadge kind="gold" count={winner.gold} />
                <MedalBadge kind="silver" count={winner.silver} />
                <MedalBadge kind="bronze" count={winner.bronze} />
              </div>
            </div>
          </header>
          {winner.reviews && winner.reviews.length > 0 && (
            <section className="winner-reviews">
              <h2>Отзывы по марафонам</h2>
              <ul>
                {winner.reviews.map((r, i) => (
                  <li key={i} className="review-item">
                    <div className="review-item__meta">
                      <strong>{r.marathon}</strong>
                      {r.languageCode && (
                        <span className="review-item__language">{formatLanguageFlag(r.languageCode)} {formatLanguageLabel(r.languageCode, r.marathon)}</span>
                      )}
                      {r.state && <span>{r.state}</span>}
                    </div>
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
