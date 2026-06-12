import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Lang {
  code: string;
  name: string;
}

interface CatalogReadiness {
  ready: boolean;
  registrationOpen: boolean;
  counts: {
    activeMarathons: number;
    steps: number;
    products: number;
    unusedGifts: number;
  };
  missing: string[];
}

/**
 * Standalone registration: choose language and go to landing with registration form.
 */
export default function Register() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Регистрация на марафон — Marathon';
    Promise.all([
      fetch('/api/v1/marathons/languages')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => (Array.isArray(data) ? data : [])),
      fetch('/api/v1/marathons/readiness')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([languageData, readinessData]) => {
        setLanguages(languageData);
        setReadiness(readinessData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const registrationClosed = !loading && languages.length === 0;

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Регистрация на марафон</h1>
      <p>Выберите язык марафона и перейдите на страницу регистрации.</p>
      {loading && <p>Загрузка…</p>}
      {registrationClosed && (
        <section className="registration-closed-panel" aria-live="polite">
          <h2>Регистрация пока закрыта</h2>
          <p>
            Активный марафон еще не настроен в production. Как только каталог марафона будет загружен,
            здесь появятся доступные языки.
          </p>
          {readiness && (
            <dl className="registration-readiness-list">
              <div><dt>Активные марафоны</dt><dd>{readiness.counts.activeMarathons}</dd></div>
              <div><dt>Этапы</dt><dd>{readiness.counts.steps}</dd></div>
              <div><dt>VIP продукты</dt><dd>{readiness.counts.products}</dd></div>
              <div><dt>Подарочные коды</dt><dd>{readiness.counts.unusedGifts}</dd></div>
            </dl>
          )}
          <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
        </section>
      )}
      <ul className="register-lang-list">
        {languages.map((lang) => (
          <li key={lang.code}>
            <Link to={`/${lang.code}/#register`}>{lang.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
