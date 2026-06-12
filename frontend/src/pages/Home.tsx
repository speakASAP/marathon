import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Lang {
  code: string;
  name: string;
  url?: string;
}

interface Winner {
  id: string;
  name?: string;
  gold?: number;
  silver?: number;
  bronze?: number;
}

interface Review {
  name: string;
  text: string;
}

interface CatalogReadiness {
  registrationOpen: boolean;
  counts: {
    activeMarathons: number;
    steps: number;
    stepsWithContent: number;
    products: number;
    unusedGifts: number;
  };
}

/**
 * Home: hub with hero, language landings list, and winners/reviews teaser.
 */
export default function Home() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Языковые марафоны SpeakASAP® — Marathon';
  }, []);

  useEffect(() => {
    setLoadError('');
    Promise.all([
      fetch('/api/v1/marathons/languages')
        .then((r) => (r.ok ? r.json() : []))
        .then((d: Lang[]) => (Array.isArray(d) ? d : [])),
      fetch('/api/v1/marathons/readiness').then((r) => {
        if (!r.ok) throw new Error(`readiness:${r.status}`);
        return r.json();
      }),
      fetch('/api/v1/winners?page=1&limit=6')
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: Winner[] }) => (d && Array.isArray(d.items) ? d.items : []))
        .catch(() => []),
      fetch('/api/v1/reviews')
        .then((r) => (r.ok ? r.json() : []))
        .then((d: Review[]) => (Array.isArray(d) ? d.slice(0, 3) : []))
        .catch(() => []),
    ])
      .then(([langs, ready, win, rev]) => {
        setLanguages(langs);
        setReadiness(ready);
        setWinners(win);
        setReviews(rev);
      })
      .catch(() => {
        setLanguages([]);
        setReadiness(null);
        setWinners([]);
        setReviews([]);
        setLoadError('Marathon home could not be loaded. Refresh this page, or contact support if the problem continues.');
      })
      .finally(() => setLoading(false));
  }, []);

  const registrationOpen = readiness?.registrationOpen === true;
  const catalogClosed = !loading && !registrationOpen;
  const heroSub = catalogClosed
    ? 'Регистрация откроется после загрузки утвержденного каталога марафона.'
    : 'Изучи любой язык быстро на уровень А1 за 30 дней. Елена Шипилова®.';

  if (loadError) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Marathon home is temporarily unavailable</h1>
        <section className="profile-empty-panel" role="alert">
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
      </div>
    );
  }

  return (
    <div className="page-home">
      {/* Legacy-aligned hero (stripe blue like legacy hub) */}
      <section className="section-marathon section-marathon-promo page-home-hero">
        <div className="container">
          <h1 className="home-hero-title">Языковые марафоны SpeakASAP®</h1>
          <p className="home-hero-sub">{heroSub}</p>
          <Link
            to="/register"
            className={`btn btn-landing home-hero-cta ${catalogClosed ? 'is-closed' : 'btn-green'}`}
          >
            {catalogClosed ? 'Статус регистрации' : 'Начать марафон'}
          </Link>
        </div>
      </section>

      {/* Language list — legacy "Выберите язык" style */}
      <section className="section-marathon section-marathon-advantages">
        <div className="container">
          <h2 className="home-section-title">Выберите язык</h2>
          {loading && <p className="text-center">Загрузка…</p>}
          {catalogClosed && (
            <div className="home-empty-catalog">
              <h3>Регистрация скоро откроется</h3>
              <p>
                Production каталог ожидает утвержденных марафонов, заданий, VIP продукта и подарочных кодов.
              </p>
              {readiness && (
                <small>
                  Активные марафоны: {readiness.counts.activeMarathons};
                  {' '}этапы с заданиями: {readiness.counts.stepsWithContent}/{readiness.counts.steps};
                  {' '}VIP продукты: {readiness.counts.products};
                  {' '}подарочные коды: {readiness.counts.unusedGifts}
                </small>
              )}
              <Link to="/support">Поддержка</Link>
            </div>
          )}
          <ul className="home-lang-list">
            {!catalogClosed && languages.map((lang) => (
              <li key={lang.code}>
                <Link to={`/${lang.code}/`} className="home-lang-card">
                  {lang.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Winners and reviews teaser — legacy dark stripe */}
      <section className="section-marathon section-marathon-dark">
        <div className="container">
          <h2 className="home-section-title">Финалисты и отзывы</h2>
          <div className="home-teaser-grid">
            <div className="home-teaser-block">
              <h3>Финалисты</h3>
              {winners.length > 0 ? (
                <ul className="home-teaser-list">
                  {winners.slice(0, 5).map((w) => (
                    <li key={w.id}>
                      <Link to={`/winners/${w.id}`}>{w.name || 'Участник'}</Link>
                    </li>
                  ))}
                </ul>
              ) : loading ? (
                <p>Загрузка…</p>
              ) : (
                <p>Финалисты появятся после завершения первых марафонов.</p>
              )}
              <Link to="/winners" className="home-teaser-link">Все финалисты →</Link>
            </div>
            <div className="home-teaser-block">
              <h3>Отзывы</h3>
              {reviews.length > 0 ? (
                <ul className="home-teaser-list">
                  {reviews.map((r, i) => (
                    <li key={i} className="home-teaser-review">
                      <strong>{r.name}</strong>
                      <p>{r.text.slice(0, 120)}{r.text.length > 120 ? '…' : ''}</p>
                    </li>
                  ))}
                </ul>
              ) : loading ? (
                <p>Загрузка…</p>
              ) : (
                <p>Отзывы появятся после запуска марафона.</p>
              )}
              <Link to="/reviews" className="home-teaser-link">Все отзывы →</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
