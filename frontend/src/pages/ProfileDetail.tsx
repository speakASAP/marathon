import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getLoginUrl, getPasswordResetUrl, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  MarathonNotFoundError,
  createPaymentCheckout,
  fetchMyMarathon,
  reconcilePaymentStatus,
  saveNpsSurvey,
  type Answer,
  type PaymentMethod,
  type MyMarathon,
} from '../api/profileMarathon';
import { stripHeadingTerminalPeriod } from '../components/assignment/assignmentBlockNormalization';

type PaymentReturnState = 'success' | 'cancelled' | null;
type MedalKind = 'gold' | 'silver' | 'bronze';

const MEDAL_LABELS: Record<MedalKind, { title: string; prize: string; detail: string }> = {
  gold: {
    title: 'Золотой финалист',
    prize: 'Ваш приз: золотая медаль',
    detail: 'Марафон завершен без потери штрафного круга и бонусных дней.',
  },
  silver: {
    title: 'Серебряный финалист',
    prize: 'Ваш приз: серебряная медаль',
    detail: 'Марафон завершен с сохраненными бонусными днями.',
  },
  bronze: {
    title: 'Бронзовый финалист',
    prize: 'Ваш приз: бронзовая медаль',
    detail: 'Марафон завершен. Приз зафиксирован в вашем профиле.',
  },
};

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string; detail: string; disabled?: boolean }> = [
  { value: 'paypal', label: 'Оплата через аккаунт PayPal', detail: 'Оплата через аккаунт PayPal.' },
  { value: 'card', label: 'Оплата банковской картой', detail: 'Visa, Mastercard или другая банковская карта через защищенный Stripe Checkout.' },
  {
    value: 'fiobanka',
    label: 'Банковский перевод',
    detail: 'Откроется QR для оплаты из банковского приложения в Чехии. Работает только для оплаты по Чехии.',
  },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}




function getStateLabel(answer: Answer) {
  if (answer.block_reason === 'payment_required') return 'Оплата';
  if (answer.is_late) return 'Поздно';
  if (answer.state === 'completed' || answer.state === 'done') return 'Готово';
  if (answer.state === 'checked') return 'Проверено';
  if (answer.state === 'active') return 'Активно';
  return 'Закрыто';
}

function getStepMeta(answer: Answer) {
  if (answer.block_reason === 'payment_required') {
    return 'Для открытия задания нужна оплата марафона.';
  }
  if (answer.state === 'inactive') {
    if (answer.is_scheduled_future) {
      return `По расписанию: ${formatDateTime(answer.start)}. Можно открыть заранее.`;
    }
    return 'Откроется после выполнения предыдущего задания. Можно открыть заранее.';
  }
  if (answer.state === 'completed' || answer.state === 'done') {
    return `Сохранено ${formatDateTime(answer.stop)}.`;
  }
  return `${answer.is_late ? 'Поздно. ' : ''}Срок: ${formatDateTime(answer.stop)}.`;
}

function getStepStatusText(answer: Answer) {
  const label = getStateLabel(answer);
  const meta = getStepMeta(answer);
  return label === 'Поздно' && meta.startsWith('Поздно.')
    ? meta
    : `${label} · ${meta}`;
}

/**
 * My marathon detail: GET /api/v1/me/marathons/:marathonerId (Bearer).
 * Shows current step, progress, link to step page.
 */
export default function ProfileDetail() {
  const { marathonerId } = useParams<{ marathonerId: string }>();
  const [data, setData] = useState<MyMarathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paypal');
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  const [paymentStatusError, setPaymentStatusError] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState('');
  const [npsSaving, setNpsSaving] = useState(false);
  const [npsMessage, setNpsMessage] = useState('');
  const [npsError, setNpsError] = useState('');

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get('payment');
    if (payment === 'success') setPaymentReturn('success');
    if (payment === 'cancelled' || payment === 'cancel') setPaymentReturn('cancelled');
  }, []);

  useEffect(() => {
    if (!marathonerId) return;
    setLoading(true);
    setUnauth(false);
    setNotFound(false);
    setLoadError('');
    fetchMyMarathon(marathonerId)
      .then((marathonData) => {
        setData(marathonData);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setUnauth(true);
        } else if (error instanceof MarathonNotFoundError) {
          setNotFound(true);
        } else {
          setLoadError('Профиль марафона не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        }
        setLoading(false);
      });
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `${data.title} — Марафон`;
    if (data?.nps_survey) {
      setNpsScore(data.nps_survey.score);
      setNpsComment(data.nps_survey.comment || '');
    } else if (data) {
      setNpsScore(null);
      setNpsComment('');
    }
  }, [data]);

  useEffect(() => {
    if (paymentReturn !== 'success' || !data?.payment_required) return undefined;

    let stopped = false;
    let timer: number | undefined;

    const refreshPaymentStatus = async () => {
      try {
        await reconcilePaymentStatus(data.id);
        const nextData = await fetchMyMarathon(data.id);
        if (stopped) return;
        setData(nextData);
        if (!nextData.payment_required) {
          setCheckoutError('');
          setPaymentStatusError('');
          return;
        }
        timer = window.setTimeout(refreshPaymentStatus, 3_000);
      } catch (error) {
        if (stopped) return;
        if (error instanceof MarathonAuthRequiredError) {
          redirectToLogin(`/profile/${data.id}`);
          return;
        }
        setPaymentStatusError('Не удалось обновить статус оплаты. Мы продолжим проверку автоматически.');
        timer = window.setTimeout(refreshPaymentStatus, 6_000);
      }
    };

    refreshPaymentStatus();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentReturn, data?.id, data?.payment_required]);

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="container page-static">
        <h1>Войдите в профиль марафона</h1>
        <section className="profile-empty-panel" role="alert">
          <p>
            Этот профиль уже должен быть привязан к единому аккаунту Alfares. Войдите через центральный вход,
            затем мы вернем вас на эту страницу.
          </p>
          <div className="profile-payment-actions">
            <a className="btn-profile-open" href={getLoginUrl(`/profile/${marathonerId}`)}>
              Войти с email или телефоном
            </a>
            <a className="btn-profile-login" href={getPasswordResetUrl()}>Восстановить пароль</a>
            <Link to="/faq" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <h1>Профиль марафона временно недоступен</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/faq" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        </section>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container">
        <p>Марафон не найден.</p>
        <Link to="/profile">← Мои марафоны</Link>
      </div>
    );
  }

  const current = data.current_step;
  const completedCount = data.answers.filter((answer) => answer.state === 'done' || answer.state === 'completed' || answer.state === 'checked').length;
  const progressPct = data.answers.length ? Math.round((completedCount / data.answers.length) * 100) : 0;
  const showBonusDays = data.bonus_total > 0;
  const medal = data.medal ? MEDAL_LABELS[data.medal] : null;
  const paymentProcessing = paymentReturn === 'success' && data.payment_required;
  const paymentReturnTitle = paymentReturn === 'success'
    ? (paymentProcessing ? 'Платеж обрабатывается' : 'Оплата подтверждена')
    : 'Оплата отменена';
  const paymentReturnBody = paymentReturn === 'success'
    ? (paymentProcessing
      ? 'Мы проверяем подтверждение оплаты автоматически. Когда провайдер подтвердит платеж, задания откроются на этой странице.'
      : 'Оплата подтверждена, задания доступны из этого профиля.')
    : 'Списание не выполнено. Вы можете снова открыть оплату или обратиться в поддержку с этой страницы.';

  const startCheckout = async () => {
    if (!data) return;
    const selectedMethod = PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod);
    if (selectedMethod?.disabled) {
      setCheckoutError('Банковский перевод временно недоступен. Используйте PayPal или оплату банковской картой.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const redirectUrl = await createPaymentCheckout(data.id, paymentMethod);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError('Оплата создана, но корректная ссылка для перехода не вернулась.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}#payment-access`);
        return;
      }
      setCheckoutError(error instanceof Error ? error.message : 'Не удалось открыть оплату');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const submitNps = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || npsScore === null) {
      setNpsError('Выберите оценку от 0 до 10.');
      return;
    }
    setNpsSaving(true);
    setNpsError('');
    setNpsMessage('');
    try {
      const body = await saveNpsSurvey(data.id, npsScore, npsComment);
      setData({ ...data, nps_survey: body });
      setNpsMessage('Спасибо. Ваш отзыв о марафоне сохранен.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      setNpsError(error instanceof Error ? error.message : 'Не удалось сохранить отзыв');
    } finally {
      setNpsSaving(false);
    }
  };

  return (
    <div className="container page-static profile-dashboard">
      <section className="profile-hero-panel">
        <div>
          <h1>{stripHeadingTerminalPeriod(data.title)}</h1>
          {showBonusDays && (
            <p className="profile-meta">
              {`Бонусных дней: ${data.bonus_left} из ${data.bonus_total}.`}
            </p>
          )}
        </div>
        <div className="profile-progress-card">
          <span>Прогресс</span>
          <strong>{progressPct}%</strong>
          <div className="profile-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
      </section>
      {data.finished_at && (
        <section className="profile-completion-panel">
          <div>
            <p className="profile-completion-kicker">Марафон завершен</p>
            <h2>{medal?.title || 'Финалист марафона'}</h2>
            <p>{medal?.detail || `Финиш зафиксирован ${formatDateTime(data.finished_at)}.`}</p>
          </div>
          {medal && (
            <div className={`profile-prize-badge profile-prize-badge-${data.medal}`}>
              <span className={`medal-badge medal-badge--${data.medal}`}>
                <span className="medal-badge__medal" aria-hidden="true">
                  <span className="medal-badge__ribbon" />
                  <span className="medal-badge__coin">1</span>
                </span>
                <span className="medal-badge__label">{medal.prize}</span>
              </span>
              <Link to={`/profile/${encodeURIComponent(data.id)}/awards`} className="btn-profile-open">
                Получить призы
              </Link>
            </div>
          )}
        </section>
      )}
      {paymentReturn && (
        <section className={`profile-payment-return profile-payment-return-${paymentReturn}`}>
          <div className="profile-payment-return-copy">
            {paymentProcessing && <span className="profile-payment-spinner" aria-hidden="true" />}
            <div>
              <h2>{paymentReturnTitle}</h2>
              <p>{paymentReturnBody}</p>
              {paymentStatusError && <p className="ml-error">{paymentStatusError}</p>}
            </div>
          </div>
        </section>
      )}
      {data.payment_required && !paymentProcessing && (
        <section className="profile-payment-panel" id="payment-access">
          <div>
            <h2>Нужна оплата марафона</h2>
            <p>Оплатите марафон, чтобы открыть задания и продолжить прохождение.</p>
            {checkoutError && <p className="ml-error">{checkoutError}</p>}
          </div>
          <div className="profile-payment-methods" role="radiogroup" aria-label="Способ оплаты">
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={[
                  'profile-payment-method',
                  paymentMethod === option.value ? 'selected' : '',
                  option.disabled ? 'disabled' : '',
                ].filter(Boolean).join(' ')}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => {
                    if (!option.disabled) setPaymentMethod(option.value);
                  }}
                  disabled={checkoutLoading || option.disabled}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open profile-payment-cta" onClick={startCheckout} disabled={checkoutLoading || PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod)?.disabled}>
              {checkoutLoading ? 'Открываем оплату...' : 'Оплатить'}
            </button>
          </div>
        </section>
      )}
      {current && !data.finished_at && (
        <section className="profile-current">
          <h2>Текущий этап</h2>
          <p><strong>{current.title}</strong></p>
          <p>
            {getStepStatusText(current)}
          </p>
          <Link to={`/steps/${current.stepId}?marathonerId=${encodeURIComponent(data.id)}`} className="btn-profile-open">
            Открыть задание
          </Link>
        </section>
      )}
      {data.finished_at && (
        <section className="profile-nps-panel">
          <div>
            <h2>Отзыв о марафоне</h2>
            <p>Ваша личная оценка помогает улучшать будущие задания и поддержку марафона.</p>
          </div>
          <form onSubmit={submitNps} className="profile-nps-form">
            <fieldset>
              <legend>Насколько вероятно, что вы порекомендуете этот марафон?</legend>
              <div className="profile-nps-scale">
                {Array.from({ length: 11 }, (_, score) => (
                  <label key={score} className={npsScore === score ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="nps-score"
                      value={score}
                      checked={npsScore === score}
                      onChange={() => setNpsScore(score)}
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="nps-comment">Что нам улучшить?</label>
            <textarea
              id="nps-comment"
              value={npsComment}
              onChange={(event) => setNpsComment(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Необязательная личная заметка для команды марафона"
            />
            <div className="profile-payment-actions">
              <button type="submit" className="btn-profile-open" disabled={npsSaving || npsScore === null}>
                {npsSaving ? 'Сохранение...' : data.nps_survey ? 'Обновить отзыв' : 'Сохранить отзыв'}
              </button>
              {data.nps_survey && <span className="profile-nps-saved">Сохранено {formatDateTime(data.nps_survey.submitted_at)}</span>}
            </div>
            {npsMessage && <p className="step-submit-success">{npsMessage}</p>}
            {npsError && <p className="ml-error">{npsError}</p>}
          </form>
        </section>
      )}
      <section className="profile-steps">
        <h2>Этапы</h2>
        <ul className="profile-answers">
          {data.answers.map((a) => {
            const paymentBlocked = a.block_reason === 'payment_required';
            const canOpen = Boolean(a.can_open) && !paymentBlocked;
            return (
              <li key={String(a.id)} className={`answer-state-${a.state}${paymentBlocked ? ' answer-state-payment-required' : ''}`}>
                <div className="profile-step-main">
                  <div className="profile-step-heading">
                    <span className="answer-title">{a.title}</span>
                    {!paymentBlocked && <span className="answer-state">{getStateLabel(a)}</span>}
                  </div>
                  <span className="profile-step-meta">{getStepStatusText(a)}</span>
                </div>
                {canOpen && (
                  <Link className="profile-step-action" to={`/steps/${a.stepId}?marathonerId=${encodeURIComponent(data.id)}`}>
                    {a.state === 'inactive' ? 'Открыть заранее' : 'Открыть'}
                  </Link>
                )}
                {!canOpen && !paymentBlocked && (
                  <span className="profile-step-action profile-step-action-disabled">Закрыто</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
