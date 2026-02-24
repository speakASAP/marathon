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

/**
 * Home: hub with hero, language landings list, and winners/reviews teaser.
 */
export default function Home() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Языковые марафоны SpeakASAP® — Marathon';
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/marathons/languages').then((r) => r.json()).then((d: Lang[]) => (Array.isArray(d) ? d : [])),
      fetch('/api/v1/winners?page=1&limit=6').then((r) => r.json()).then((d: { items?: Winner[] }) => (d && Array.isArray(d.items) ? d.items : [])),
      fetch('/api/v1/reviews').then((r) => r.json()).then((d: Review[]) => (Array.isArray(d) ? d.slice(0, 3) : [])),
    ])
      .then(([langs, win, rev]) => {
        setLanguages(langs);
        setWinners(win);
        setReviews(rev);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-home">
      {/* Legacy-aligned hero (stripe blue like legacy hub) */}
      <section className="section-marathon section-marathon-promo page-home-hero">
        <div className="container">
          <h1 className="home-hero-title">Языковые марафоны SpeakASAP®</h1>
          <p className="home-hero-sub">Изучи любой язык быстро на уровень А1 за 30 дней. Елена Шипилова®.</p>
          <Link to="/register" className="btn btn-landing btn-green home-hero-cta">
            Начать марафон
          </Link>
        </div>
      </section>

      {/* Language list — legacy "Выберите язык" style */}
      <section className="section-marathon section-marathon-advantages">
        <div className="container">
          <h2 className="home-section-title">Выберите язык</h2>
          {loading && <p className="text-center">Загрузка…</p>}
          <ul className="home-lang-list">
            {languages.map((lang) => (
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
              ) : (
                <p>Загрузка…</p>
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
              ) : (
                <p>Загрузка…</p>
              )}
              <Link to="/reviews" className="home-teaser-link">Все отзывы →</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
