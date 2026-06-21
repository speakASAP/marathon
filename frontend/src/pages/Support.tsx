import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';

const SUPPORT_EMAIL = 'marathon@speakasap.com';

function formatMissingLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Support() {
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Поддержка — Marathon';
    setLoading(true);
    setError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setError('Статус регистрации временно недоступен. Перед стартом марафона обратитесь в поддержку.');
      })
      .finally(() => setLoading(false));
  }, []);

  const registrationOpen = readiness?.registrationOpen === true;
  const missing = readiness?.missing ?? [];

  return (
    <div className="container page-static page-support">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>

      <section className="support-public-hero">
        <div>
          <h1>Поддержка Marathon</h1>
          <p>
            Помощь с регистрацией, доступом к профилю, VIP-статусом, подарочными кодами и страницами заданий.
          </p>
        </div>
        <a className="btn-profile-login" href={`mailto:${SUPPORT_EMAIL}`}>
          Связаться с поддержкой
        </a>
      </section>

      <section className="support-public-status" aria-live="polite">
        <div>
          <span>Статус регистрации</span>
          <strong>{loading ? 'Проверяем' : registrationOpen ? 'Открыта' : 'Пока закрыта'}</strong>
        </div>
        {error ? (
          <p className="ml-error">{error}</p>
        ) : registrationOpen ? (
          <p>Регистрация открыта. Выберите язык и начните со страницы регистрации.</p>
        ) : (
          <p>
            Регистрация откроется после готовности утвержденного каталога, заданий, VIP-продукта и подарочных кодов.
          </p>
        )}
        {!loading && readiness && (
          <dl className="support-public-counts">
            <div><dt>Активные марафоны</dt><dd>{readiness.counts.activeMarathons}</dd></div>
            <div><dt>Задания</dt><dd>{readiness.counts.stepsWithContent}/{readiness.counts.steps}</dd></div>
            <div><dt>VIP-продукты</dt><dd>{readiness.counts.products}</dd></div>
            <div><dt>Подарочные коды</dt><dd>{readiness.counts.unusedGifts}</dd></div>
          </dl>
        )}
        {!loading && missing.length > 0 && (
          <div className="support-public-missing" aria-label="Блокеры регистрации">
            {missing.map((item) => (
              <span key={item}>{formatMissingLabel(item)}</span>
            ))}
          </div>
        )}
        <div className="support-public-actions">
          <Link to="/register" className="btn-profile-login">
            {registrationOpen ? 'Перейти к регистрации' : 'Посмотреть статус регистрации'}
          </Link>
          <Link to="/profile" className="btn-profile-open">Открыта profile</Link>
        </div>
      </section>

      <section className="support-public-grid">
        <article>
          <span>Профиль и вход</span>
          <h2>Не видите свой марафон?</h2>
          <p>
            Войдите через SpeakASAP со страницы профиля. Если участник уже привязан, вход вернет вас в нужный профиль марафона.
          </p>
          <Link to="/profile">Открыта profile</Link>
        </article>
        <article>
          <span>VIP-доступ</span>
          <h2>Оплата или подарочный код</h2>
          <p>
            Оплата VIP и подарочный код появляются в профиле марафона, когда активен VIP-этап и готов каталог запуска.
          </p>
          <Link to="/gift">Страница подарочного кода</Link>
        </article>
        <article>
          <span>Задания</span>
          <h2>Отправка отчета</h2>
          <p>
            Открыта assignments from your marathon profile so the page can verify your participant ID, login session, saved report state, and assignment content.
          </p>
          <Link to="/profile">Продолжить марафон</Link>
        </article>
      </section>

      <section className="support-public-contact">
        <h2>Что указать</h2>
        <ul>
          <li>Ваш email регистрации.</li>
          <li>Языковой марафон, который вы пытаетесь открыть.</li>
          <li>Краткое описание страницы или действия, с которым нужна помощь.</li>
        </ul>
        <p>
          Не отправляйте пароли, данные платежных карт, полные списки подарочных кодов или личные отчеты по email.
        </p>
      </section>
    </div>
  );
}
