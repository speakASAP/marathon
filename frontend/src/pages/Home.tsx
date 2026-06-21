import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCatalogReadiness,
  fetchMarathonLanguages,
  fetchPublicReviews,
  fetchWinnerSummaries,
  type CatalogReadiness,
  type MarathonLanguage,
  type PublicReview,
  type WinnerSummary,
} from '../api/publicMarathon';
import '../landing.css';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function languagePath(language: MarathonLanguage): string {
  return `/${encodeURIComponent(language.code)}/#register`;
}

/**
 * Home: production landing entry point for registration and marathon continuation.
 */
export default function Home() {
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [winners, setWinners] = useState<WinnerSummary[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Marathon от SpeakASAP — начните языковой марафон';
  }, []);

  useEffect(() => {
    setLoadError('');
    Promise.all([
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
      fetchWinnerSummaries(6),
      fetchPublicReviews().then((items) => items.slice(0, 3)),
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
        setLoadError('Страница марафона не загрузилась. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
      })
      .finally(() => setLoading(false));
  }, []);

  const registrationOpen = readiness?.registrationOpen === true;
  const missingLaunchGates = readiness?.missing ?? [];
  const featuredLanguages = useMemo(() => languages.slice(0, 8), [languages]);
  const primaryLanguage = featuredLanguages[0];
  const startPath = primaryLanguage ? languagePath(primaryLanguage) : '/register';
  const approvedSteps = readiness ? `${readiness.counts.stepsWithContent}/${readiness.counts.steps}` : '377/377';
  const heroTitle = registrationOpen
    ? 'Начните языковой марафон сегодня'
    : 'Регистрация на марафон готовится';
  const heroCopy = registrationOpen
    ? 'Выберите язык, зарегистрируйтесь и проходите ежедневные задания, отчеты, VIP-доступ, финал и отслеживание прогресса в одном профиле.'
    : 'Регистрация откроется только после готовности активного каталога, заданий, VIP-продукта и подарочных кодов в production.';

  if (loadError) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Главная страница марафона временно недоступна</h1>
        <section className="profile-empty-panel" role="alert">
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
      </div>
    );
  }

  return (
    <div className="home-launch">
      <header className="home-launch-nav">
        <Link to="/" className="home-launch-brand" aria-label="Marathon home">
          <span>Marathon</span>
          <small>by SpeakASAP</small>
        </Link>
        <nav className="home-launch-links" aria-label="Marathon landing navigation">
          <Link to="/winners">Финалисты</Link>
          <Link to="/reviews">Отзывы</Link>
          <Link to="/rules">Правила</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/profile">Профиль</Link>
        </nav>
        <Link
          to={registrationOpen ? startPath : '/register'}
          className={`ml-primary-action${registrationOpen ? '' : ' is-closed'}`}
        >
          {registrationOpen ? 'Начать марафон' : 'Статус регистрации'}
        </Link>
      </header>

      <section className="home-launch-hero">
        <div className="home-launch-copy">
          <h1>{heroTitle}</h1>
          <p>{heroCopy}</p>
          <div className="home-launch-actions">
            <Link
              to={registrationOpen ? startPath : '/register'}
              className={`ml-primary-action large${registrationOpen ? '' : ' is-closed'}`}
            >
              {registrationOpen ? 'Начать марафон' : 'Посмотреть статус регистрации'}
            </Link>
            <Link to="/profile" className="ml-outline-action">
              Открыть мой марафон
            </Link>
          </div>
          <dl className="home-launch-metrics" aria-label="Marathon readiness">
            <div>
              <dt>{readiness?.counts.activeMarathons ?? 13}</dt>
              <dd>активных марафонов</dd>
            </div>
            <div>
              <dt>{approvedSteps}</dt>
              <dd>утвержденных заданий</dd>
            </div>
            <div>
              <dt>{readiness?.counts.products ?? 13}</dt>
              <dd>VIP-продуктов</dd>
            </div>
          </dl>
        </div>

        <div className="home-launch-visual" aria-label="Marathon profile preview">
          <div className="home-desk-scene">
            <div className="home-phone">
              <div className="home-phone-top">
                <span>Сегодня</span>
                <strong>Задание 08</strong>
              </div>
              <div className="home-progress-orbit">
                <span>{registrationOpen ? 'Открыто' : 'Готово'}</span>
              </div>
              <div className="home-phone-list">
                <span>Практическое задание</span>
                <span>Отчет сохранен</span>
                <span>VIP-доступ проверен</span>
              </div>
            </div>
            <div className="home-notebook">
              <span>Языковой марафон</span>
              <strong>Регистрация. Практика. Финиш.</strong>
              <p>Ежедневная работа связана с профилем участника.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-language-band" aria-labelledby="home-language-title">
        <div>
          <h2 id="home-language-title">Выберите язык марафона</h2>
          <p>
            {registrationOpen
              ? 'Production-каталог готов. Выберите язык и начните с формы регистрации.'
              : 'Доступные языки появятся после готовности production-запуска.'}
          </p>
        </div>
        <div className="home-language-rail">
          {loading && <span className="home-language-loading">Загрузка языков...</span>}
          {!loading && registrationOpen && featuredLanguages.map((language) => (
            <Link key={language.code} to={languagePath(language)} className="home-language-chip">
              {language.name}
            </Link>
          ))}
          {!loading && !registrationOpen && (
            <Link to="/register" className="home-language-chip is-status">
              Статус регистрации
            </Link>
          )}
        </div>
      </section>

      {!registrationOpen && missingLaunchGates.length > 0 && (
        <section className="home-launch-status" aria-label="Launch status">
          <strong>Проверка готовности еще показывает блокеры запуска</strong>
          <div>
            {missingLaunchGates.map((item) => (
              <span key={item}>{formatMissingGate(item)}</span>
            ))}
          </div>
          <Link to="/support" className="ml-outline-action">Открыть инструкции поддержки</Link>
        </section>
      )}

      <section className="home-flow" aria-labelledby="home-flow-title">
        <div className="ml-section-head">
          <h2 id="home-flow-title">Единый путь от регистрации до финиша</h2>
          <p>Марафон построен вокруг реального production-пути: регистрация, работа в профиле, открытие VIP-доступа и выполнение заданий.</p>
        </div>
        <div className="home-flow-grid">
          <article>
            <span>01</span>
            <h3>Регистрация</h3>
            <p>Выберите язык и создайте профиль участника из актуального каталога.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Практика</h3>
            <p>Откройте утвержденное ежедневное задание и сохраните отчет на странице этапа.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Откройте VIP</h3>
            <p>Используйте оплату или подарочный код из профиля, когда потребуется полный доступ.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Финиш</h3>
            <p>Завершенные отчеты связывают прогресс, статус финалиста и отзыв после марафона.</p>
          </article>
        </div>
      </section>

      <section className="home-proof" aria-labelledby="home-proof-title">
        <div className="ml-section-head">
          <h2 id="home-proof-title">Результаты остаются видимыми</h2>
          <p>Финалисты и отзывы берутся из платформы Marathon, а личные отчеты и комментарии опросов не публикуются.</p>
        </div>
        <div className="home-proof-grid">
          <article className="home-proof-panel">
            <h3>Финалисты</h3>
            {winners.length > 0 ? (
              <ul>
                {winners.slice(0, 5).map((winner) => (
                  <li key={winner.id}>
                    <Link to={`/winners/${winner.id}`}>{winner.name || 'Участник'}</Link>
                    <span>{winner.gold ?? 0} золотых</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{loading ? 'Загрузка финалистов...' : 'Финалисты появятся после обработки завершенных марафонов.'}</p>
            )}
            <Link to="/winners" className="ml-outline-action">Посмотреть финалистов</Link>
          </article>
          <article className="home-proof-panel">
            <h3>Отзывы</h3>
            {reviews.length > 0 ? (
              <ul>
                {reviews.map((review) => (
                  <li key={`${review.name}-${review.text}`}>
                    <strong>{review.name}</strong>
                    <p>{review.text.slice(0, 140)}{review.text.length > 140 ? '...' : ''}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{loading ? 'Загрузка отзывов...' : 'Отзывы появятся после завершения марафонов участниками.'}</p>
            )}
            <Link to="/reviews" className="ml-outline-action">Читать отзывы</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
