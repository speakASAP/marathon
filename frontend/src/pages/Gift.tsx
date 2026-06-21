import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getToken, redirectToLogin } from '../auth';
import { MarathonAuthRequiredError, redeemGiftCode } from '../api/journeyMarathon';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Gift() {
  const [code, setCode] = useState('');
  const [marathonerId, setMarathonerId] = useState('');
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Подарочный код — Marathon SpeakASAP';
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setReadinessError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setReadinessError('Статус подарочного кода не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
      })
      .finally(() => setReadinessLoading(false));
  }, []);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (readinessError) {
      setError('Статус подарочного кода временно недоступен. Обновите страницу перед повторной попыткой.');
      return;
    }
    if (readiness?.giftReady === false) {
      setError('Подарочные коды будут доступны после настройки активного марафона и неиспользованных кодов.');
      return;
    }
    if (!marathonerId.trim()) {
      setError('Откройте форму подарочного кода из профиля марафона, чтобы передался ID участника.');
      return;
    }
    if (!getToken()) {
      redirectToLogin(`/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
      return;
    }
    if (!code.trim()) {
      setError('Введите подарочный код.');
      return;
    }

    setSubmitting(true);
    try {
      const body = await redeemGiftCode(marathonerId.trim(), code.trim());
      setMessage('VIP-доступ открыт. Возвращаем вас в профиль марафона...');
      window.setTimeout(() => {
        window.location.href = body.redirectUrl || `/profile/${encodeURIComponent(marathonerId.trim())}`;
      }, 800);
    } catch (err) {
      if (err instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось применить подарочный код');
    } finally {
      setSubmitting(false);
    }
  };

  const giftStatusUnavailable = !readinessLoading && Boolean(readinessError);
  const giftUnavailable = !readinessLoading && !readinessError && readiness?.giftReady === false;
  const registrationClosed = !readinessLoading && !readinessError && readiness?.registrationOpen !== true;
  const hasParticipantContext = Boolean(marathonerId.trim());
  const needsLogin = hasParticipantContext && !getToken();
  const giftReturnPath = hasParticipantContext
    ? `/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`
    : '/profile';
  const openLogin = () => redirectToLogin(giftReturnPath);
  const redeemDisabled = submitting || readinessLoading || giftStatusUnavailable || !hasParticipantContext || needsLogin;
  const missingLaunchGates = readiness?.missing ?? [];
  const heroCopy = readinessLoading
    ? 'Проверяем готовность марафона перед показом формы подарочного кода.'
    : giftUnavailable
      ? 'Подарочные коды откроются после настройки активного марафона и утвержденных неиспользованных кодов.'
      : 'Подарочные коды открывают VIP-участие без оплаты после VIP-этапа.';

  return (
    <div className="container page-static gift-page">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мой марафон</Link>
      </nav>
      <section className="gift-hero">
        <div>
          <h1>Подарочный код для VIP-доступа к марафону</h1>
          <p>{heroCopy}</p>
        </div>
        {readinessLoading ? (
          <div className="gift-card gift-card-readiness gift-card-loading" aria-live="polite">
            <h2>Проверяем статус подарочного кода</h2>
            <p>Поле подарочного кода скрыто до проверки production-каталога и списка подарочных кодов.</p>
          </div>
        ) : giftStatusUnavailable ? (
          <div className="gift-card gift-card-readiness" role="alert">
            <h2>Статус подарочного кода временно недоступен</h2>
            <p>{readinessError}</p>
            <div className="profile-empty-actions">
              <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
                Обновить
              </button>
              <Link to="/support" className="btn-profile-login">
                Связаться с поддержкой
              </Link>
            </div>
          </div>
        ) : giftUnavailable ? (
          <div className="gift-card gift-card-readiness" aria-live="polite">
            <h2>Подарочные коды еще не готовы</h2>
            <p>Для активного марафона нет доступных неиспользованных production-кодов.</p>
            {readiness && (
              <dl className="gift-readiness-list">
                <div><dt>Активные марафоны</dt><dd>{readiness.counts.activeMarathons}</dd></div>
                <div><dt>Этапы</dt><dd>{readiness.counts.steps ?? 0}</dd></div>
                <div><dt>Этапы с заданиями</dt><dd>{readiness.counts.stepsWithContent ?? 0}</dd></div>
                <div><dt>VIP-продукты</dt><dd>{readiness.counts.products ?? 0}</dd></div>
                <div><dt>Неиспользованные подарочные коды</dt><dd>{readiness.counts.unusedGifts}</dd></div>
              </dl>
            )}
            {missingLaunchGates.length ? (
              <div className="gift-missing-gates" aria-label="Недостающие условия запуска">
                <strong>Блокеры подарочных кодов</strong>
                <div>
                  {missingLaunchGates.map((item) => (
                    <span key={item}>{formatMissingGate(item)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        ) : (
          <form className="gift-card" onSubmit={redeem}>
            {!hasParticipantContext && (
              <div className="gift-auth-panel" role="alert">
                <strong>Откройте подарочный код из профиля марафона</strong>
                <span>Ссылка из профиля содержит ID участника, нужный для открытия VIP-доступа в правильном марафоне.</span>
                <Link to="/profile" className="btn-profile-login">Открыть профиль</Link>
              </div>
            )}
            {needsLogin && (
              <div className="gift-auth-panel" role="alert">
                <strong>Войдите, чтобы применить подарочный код</strong>
                <span>Для подарочного кода нужен токен Marathon; после входа портал вернет вас к этому участнику.</span>
                <button type="button" className="btn-profile-login" onClick={openLogin}>Войти</button>
              </div>
            )}
            <label htmlFor="marathoner-id">ID участника</label>
            <input
              id="marathoner-id"
              value={marathonerId}
              onChange={(event) => setMarathonerId(event.target.value)}
              placeholder="ID участника"
            />
            <label htmlFor="gift-code">Подарочный код</label>
            <input
              id="gift-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Введите подарочный код"
              disabled={!hasParticipantContext || needsLogin}
            />
            <button type="submit" disabled={redeemDisabled}>
              {submitting ? 'Применяем...' : needsLogin ? 'Требуется вход' : 'Применить подарочный код'}
            </button>
            {message && <p>{message}</p>}
            {error && <p className="ml-error">{error}</p>}
          </form>
        )}
      </section>
      <section className="gift-next-steps">
        <article>
          <span>1</span>
          <h2>{registrationClosed ? 'Дождитесь регистрации' : 'Регистрация'}</h2>
          <p>
            {registrationClosed
              ? 'Перед созданием новых участников должен быть загружен утвержденный каталог марафона.'
              : 'Создайте запись участника и начните бесплатные дни марафона.'}
          </p>
        </article>
        <article>
          <span>2</span>
          <h2>Откройте профиль</h2>
          <p>Задания и VIP-статус отображаются в панели марафона.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Откройте VIP</h2>
          <p>Используйте оплату или подарочный код, когда VIP-этап запросит доступ.</p>
        </article>
      </section>
      <div className="gift-actions">
        {registrationClosed ? (
          <Link to="/support" className="btn-profile-open">Связаться с поддержкой</Link>
        ) : (
          <>
            <Link to="/register" className="btn-profile-open">Регистрация</Link>
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
          </>
        )}
      </div>
    </div>
  );
}
