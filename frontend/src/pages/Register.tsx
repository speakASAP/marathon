import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCatalogReadiness,
  fetchMarathonLanguages,
  getMarathonRegisterPath,
  type CatalogReadiness,
  type MarathonLanguage,
} from '../api/publicMarathon';
import { formatLanguageLabel, formatLanguageOptionLabel } from '../languages';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Standalone registration: choose language and go to landing with registration form.
 */
export default function Register() {
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Регистрация на марафон — Marathon';
    setLoadError('');
    Promise.all([
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
    ])
      .then(([languageData, readinessData]) => {
        setLanguages(languageData);
        setReadiness(readinessData);
        setLoading(false);
      })
      .catch(() => {
        setLanguages([]);
        setReadiness(null);
        setLoadError('Статус регистрации не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        setLoading(false);
      });
  }, []);

  const registrationClosed = !loading && readiness?.registrationOpen !== true;
  const sortedLanguages = useMemo(
    () => [...languages].sort((a, b) => formatLanguageLabel(a.code, a.name).localeCompare(formatLanguageLabel(b.code, b.name), 'ru')),
    [languages],
  );
  const visibleLanguages = registrationClosed ? [] : sortedLanguages;

  return (
    <div className="container page-static">
      <h1>Регистрация на марафон</h1>
      <p>Выберите язык марафона и перейдите на страницу регистрации.</p>
      {loading && <p>Загрузка…</p>}
      {loadError && (
        <section className="profile-empty-panel" role="alert">
          <h2>Статус регистрации временно недоступен</h2>
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
      {!loadError && registrationClosed && (
        <section className="registration-closed-panel" aria-live="polite">
          <h2>Регистрация пока закрыта</h2>
          <p>
            Production каталог еще не готов для регистрации. Как только активный марафон, задания,
            VIP продукт будет утвержден, здесь появятся доступные языки.
          </p>
          {readiness && (
            <dl className="registration-readiness-list">
              <div><dt>Активные марафоны</dt><dd>{readiness.counts.activeMarathons}</dd></div>
              <div><dt>Этапы</dt><dd>{readiness.counts.steps}</dd></div>
              <div><dt>Этапы с заданиями</dt><dd>{readiness.counts.stepsWithContent}</dd></div>
              <div><dt>VIP продукты</dt><dd>{readiness.counts.products}</dd></div>
              </dl>
          )}
          {readiness?.missing?.length ? (
            <div className="registration-missing-gates" aria-label="Недостающие условия запуска">
              <strong>Недостающие условия запуска</strong>
              <div>
                {readiness.missing.map((item) => (
                  <span key={item}>{formatMissingGate(item)}</span>
                ))}
              </div>
            </div>
          ) : null}
          <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
        </section>
      )}
      <ul className="register-lang-list">
        {visibleLanguages.map((lang) => (
          <li key={lang.code}>
            <Link to={getMarathonRegisterPath(lang)}>{formatLanguageOptionLabel(lang.code, lang.name)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
