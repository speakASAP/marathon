import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCatalogReadiness,
  fetchMarathonLanguages,
  fetchPublicReviews,
  fetchWinnerSummaries,
  getMarathonRegisterPath,
  type CatalogReadiness,
  type MarathonLanguage,
  type PublicReview,
  type WinnerSummary,
} from '../api/publicMarathon';
import { PUBLIC_MARATHON_LANGUAGES, formatLanguageLabel, formatLanguageOptionLabel } from '../languages';
import CertificateShowcase from '../components/CertificateShowcase';
import '../landing.css';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCount(value: number | undefined): string {
  if (typeof value !== 'number') return '0';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function getInitials(name: string | undefined): string {
  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'У';
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
    document.title = 'Марафон от SpeakASAP — начните языковой марафон';
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
  const fallbackLanguages = useMemo<MarathonLanguage[]>(
    () => PUBLIC_MARATHON_LANGUAGES.map((language) => ({
      code: language.code,
      name: language.label.replace(/\s+A1$/, ''),
      url: `/${language.slug}/`,
    })),
    [],
  );
  const sortedLanguages = useMemo(
    () => [...languages].sort((a, b) => formatLanguageLabel(a.code, a.name).localeCompare(formatLanguageLabel(b.code, b.name), 'ru')),
    [languages],
  );
  const featuredLanguages = sortedLanguages.length ? sortedLanguages : fallbackLanguages;
  const primaryLanguage = featuredLanguages[0];
  const startPath = primaryLanguage ? getMarathonRegisterPath(primaryLanguage) : '/register';
  const approvedSteps = readiness ? `${readiness.counts.stepsWithContent}/${readiness.counts.steps}` : '377/377';
  const heroTitle = registrationOpen
    ? 'Начните языковой марафон сегодня'
    : 'Регистрация на марафон готовится';
  const heroCopy = registrationOpen
    ? 'Выберите язык, зарегистрируйтесь, оплатите марафон и проходите ежедневные задания, отчеты, финал и отслеживание прогресса в одном профиле.'
    : 'Регистрация откроется только после готовности активного каталога, заданий и платежного продукта в production.';

  if (loadError) {
    return (
      <div className="container page-static">
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
        <CertificateShowcase
          id="home-certificate-fallback"
          className="home-certificate-band"
          title="Что получает финалист"
          lead="После финиша марафона участник получает статус «Сертификат» и медальную версию сертификата по результату прохождения."
        />
      </div>
    );
  }

  return (
    <div className="home-launch">
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
          <dl className="home-launch-metrics" aria-label="Готовность марафона">
            <div>
              <dt>{formatCount(readiness?.counts.registeredParticipants)}</dt>
              <dd>участников уже зарегистрированы</dd>
            </div>
            <div>
              <dt>{readiness?.counts.activeLanguages ?? readiness?.counts.activeMarathons ?? 13}</dt>
              <dd>иностранных языков</dd>
            </div>
            <div>
              <dt>{approvedSteps}</dt>
              <dd>утвержденных заданий</dd>
            </div>
          </dl>
        </div>

        <div className="home-launch-visual" aria-label="Превью профиля марафона">
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
                <span>Оплата подтверждена</span>
              </div>
            </div>
            <div className="home-notebook">
              <span>Языковой марафон</span>
              <strong>Регистрация. Практика. Финиш A1.</strong>
              <p>Ежедневная работа связана с профилем участника.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-language-band" aria-labelledby="home-language-title">
        <div>
          <h2 id="home-language-title">Выберите язык марафона</h2>
          <p>Выберите любой доступный языковой марафон. Если регистрация еще закрыта, страница языка покажет маршрут и статус запуска.</p>
        </div>
        <div className="home-language-rail">
          {loading && <span className="home-language-loading">Загрузка языков...</span>}
          {!loading && featuredLanguages.map((language) => (
            <Link key={language.code} to={getMarathonRegisterPath(language)} className="home-language-chip">
              {formatLanguageOptionLabel(language.code, language.name)}
            </Link>
          ))}
          {!loading && featuredLanguages.length === 0 && (
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
          <p>Марафон построен вокруг реального production-пути: регистрация, оплата марафона, работа в профиле и выполнение заданий.</p>
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
            <h3>Оплатите марафон</h3>
            <p>Используйте оплату из профиля, чтобы открыть полный маршрут марафона.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Финиш</h3>
            <p>Завершенные отчеты связывают прогресс, статус финалиста и результат уровня A1.</p>
          </article>
        </div>
      </section>

      <CertificateShowcase
        id="home-certificate"
        className="home-certificate-band"
        title="Что получает финалист"
        lead="После финиша марафона участник получает статус «Сертификат» и медальную версию сертификата по результату прохождения."
      />

      <section className="home-proof" aria-labelledby="home-proof-title">
        <div className="ml-section-head">
          <h2 id="home-proof-title">Результаты остаются видимыми</h2>
          <p>Финалисты и отзывы берутся из платформы марафона, а личные отчеты и комментарии опросов не публикуются.</p>
        </div>
        <div className="home-proof-grid">
          <article className="home-proof-panel">
            <h3>Финалисты</h3>
            {winners.length > 0 ? (
              <ul>
                {winners.slice(0, 5).map((winner) => (
                  <li key={winner.id} className="home-proof-person">
                    {winner.avatar ? (
                      <img src={winner.avatar} alt="" className="home-proof-avatar" width={54} height={54} loading="lazy" />
                    ) : (
                      <span className="home-proof-avatar home-proof-avatar--placeholder" aria-hidden="true">
                        {getInitials(winner.name)}
                      </span>
                    )}
                    <div>
                      <Link to={`/winners/${winner.id}`}>{winner.name || 'Участник'}</Link>
                      <span>{winner.gold ?? 0} золотых</span>
                    </div>
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
                  <li key={`${review.name}-${review.text}`} className="home-proof-person">
                    {review.photo ? (
                      <img src={review.photo} alt="" className="home-proof-avatar" width={54} height={54} loading="lazy" />
                    ) : (
                      <span className="home-proof-avatar home-proof-avatar--placeholder" aria-hidden="true">
                        {getInitials(review.name)}
                      </span>
                    )}
                    <div>
                      <strong>{review.name}</strong>
                      <p>{review.text.slice(0, 140)}{review.text.length > 140 ? '...' : ''}</p>
                    </div>
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
