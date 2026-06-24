import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getLoginUrl, getPasswordResetUrl, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  MarathonNotFoundError,
  createVipCheckout,
  fetchMyMarathon,
  fetchProgressReport,
  saveNpsSurvey,
  type Answer,
  type VipPaymentMethod,
  type MyMarathon,
  type ProgressReport,
} from '../api/profileMarathon';

type PaymentReturnState = 'success' | 'cancelled' | null;

const PAYMENT_METHOD_OPTIONS: Array<{ value: VipPaymentMethod; label: string; detail: string; disabled?: boolean }> = [
  { value: 'paypal', label: 'PayPal', detail: 'Оплата через PayPal в защищенном Stripe Checkout.' },
  { value: 'card', label: 'Mastercard', detail: 'Оплата Mastercard или другой поддерживаемой картой через Stripe.' },
  {
    value: 'fiobanka',
    label: 'Банковский перевод',
    detail: 'Временно недоступен: банковский QR требует настроенного счета Fio, сейчас он не подключен.',
    disabled: true,
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
  if (answer.block_reason === 'payment_required') return 'VIP';
  if (answer.is_late) return 'Поздно';
  if (answer.state === 'completed' || answer.state === 'done') return 'Готово';
  if (answer.state === 'checked') return 'Проверено';
  if (answer.state === 'active') return 'Активно';
  return 'Закрыто';
}

function getStepMeta(answer: Answer) {
  if (answer.block_reason === 'payment_required') {
    return 'Для открытия этого задания нужен VIP-доступ.';
  }
  if (answer.state === 'inactive') {
    return 'Откроется после выполнения предыдущего задания.';
  }
  if (answer.state === 'completed' || answer.state === 'done') {
    return `Сохранено ${formatDateTime(answer.stop)}.`;
  }
  return `${answer.is_late ? 'Поздно. ' : ''}Срок: ${formatDateTime(answer.stop)}.`;
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
  const [paymentMethod, setPaymentMethod] = useState<VipPaymentMethod>('paypal');
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
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
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
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
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
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
  const completedCount = data.answers.filter((answer) => answer.state === 'done' || answer.state === 'completed').length;
  const progressPct = data.answers.length ? Math.round((completedCount / data.answers.length) * 100) : 0;
  const hasCompletedAssignments = completedCount > 0;
  const showBonusDays = data.bonus_total > 0;
  const paymentReturnTitle = paymentReturn === 'success'
    ? (data.needs_payment ? 'Подтверждение оплаты обрабатывается' : 'VIP-доступ активен')
    : 'Оплата отменена';
  const paymentReturnBody = paymentReturn === 'success'
    ? (data.needs_payment
      ? 'Платежный провайдер вернул вас сюда. Мы ждем защищенный callback для подтверждения VIP-доступа; обновите страницу через минуту, если блокировка еще видна.'
      : 'Оплата подтверждена, следующие VIP-задания доступны из этого профиля.')
    : 'Списание не выполнено. Вы можете снова открыть оплату или обратиться в поддержку с этой страницы.';

  const startCheckout = async () => {
    if (!data) return;
    const selectedMethod = PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod);
    if (selectedMethod?.disabled) {
      setCheckoutError('Банковский перевод временно недоступен. Используйте PayPal или Mastercard.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const redirectUrl = await createVipCheckout(data.id, paymentMethod);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError('Оплата создана, но корректная ссылка для перехода не вернулась.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}#vip-access`);
        return;
      }
      setCheckoutError(error instanceof Error ? error.message : 'Не удалось открыть оплату');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const loadProgressReport = async () => {
    if (!data) return;
    setReportLoading(true);
    setReportError('');
    try {
      setReport(await fetchProgressReport(data.id));
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      setReportError(error instanceof Error ? error.message : 'Не удалось сформировать отчет прогресса');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadProgressReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marathon-progress-${report.participant.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
          <h1>{data.title}</h1>
          {(data.type === 'trial' || showBonusDays) && (
            <p className="profile-meta">
              {data.type === 'trial' && 'Пробный период. '}
              {showBonusDays && `Бонусных дней: ${data.bonus_left} из ${data.bonus_total}.`}
            </p>
          )}
        </div>
        <div className="profile-progress-card">
          <span>Прогресс</span>
          <strong>{progressPct}%</strong>
          <div className="profile-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
      </section>
      {paymentReturn && (
        <section className={`profile-payment-return profile-payment-return-${paymentReturn}`}>
          <div>
            <h2>{paymentReturnTitle}</h2>
            <p>{paymentReturnBody}</p>
          </div>
          {paymentReturn === 'success' && data.needs_payment && (
            <button type="button" className="btn-profile-login" onClick={() => window.location.reload()}>
              Обновить статус
            </button>
          )}
        </section>
      )}
      {data.needs_payment && (
        <section className="profile-payment-panel" id="vip-access">
          <div>
            <h2>Нужен VIP-доступ</h2>
            <p>В этом марафоне активен VIP-этап. Оплатите доступ, чтобы открыть следующие задания.</p>
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
            <button type="button" className="btn-profile-open" onClick={startCheckout} disabled={checkoutLoading || PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod)?.disabled}>
              {checkoutLoading ? 'Открываем оплату...' : `Оплатить через ${PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod)?.label || 'выбранный способ'}`}
            </button>
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        </section>
      )}
      {current && (
        <section className="profile-current">
          <h2>Текущий этап</h2>
          <p><strong>{current.title}</strong></p>
          <p>
            {getStateLabel(current)}
            {' · '}
            {getStepMeta(current)}
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
      {hasCompletedAssignments && (
      <section className="profile-report-panel">
        <div className="profile-report-heading">
          <div>
            <h2>Отчет прогресса</h2>
            <p>Сводка по выполненным заданиям, VIP и попыткам оплаты для этого марафона.</p>
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={loadProgressReport} disabled={reportLoading}>
              {reportLoading ? 'Формируем...' : 'Сформировать отчет'}
            </button>
            {report && (
              <button type="button" className="btn-profile-login" onClick={downloadProgressReport}>
                Скачать JSON
              </button>
            )}
          </div>
        </div>
        {reportError && <p className="ml-error">{reportError}</p>}
        {report && (
          <div className="profile-report-summary" aria-live="polite">
            <div><span>Выполнено</span><strong>{report.summary.completedSteps}/{report.summary.totalSteps}</strong></div>
            <div><span>Проверено</span><strong>{report.summary.checkedSteps}</strong></div>
            <div><span>Поздно</span><strong>{report.summary.lateSteps}</strong></div>
            {report.access.bonusDaysTotal > 0 && (
              <div><span>Бонусных дней</span><strong>{report.access.bonusDaysLeft}/{report.access.bonusDaysTotal}</strong></div>
            )}
            <div><span>VIP</span><strong>{report.access.needsPayment ? 'Требуется' : report.access.type.toUpperCase()}</strong></div>
            <div><span>Оплаты</span><strong>{report.summary.paymentAttempts}</strong></div>
            {report.currentStep && (
              <div className="profile-report-current">
                <span>Текущий этап</span>
                <strong>{report.currentStep.title}</strong>
              </div>
            )}
          </div>
        )}
      </section>
      )}
      <section className="profile-steps">
        <h2>Этапы</h2>
        <ul className="profile-answers">
          {data.answers.map((a) => {
            const paymentBlocked = a.block_reason === 'payment_required';
            const canOpen = a.state !== 'inactive' && !paymentBlocked;
            return (
              <li key={String(a.id)} className={`answer-state-${a.state}${paymentBlocked ? ' answer-state-payment-required' : ''}`}>
                <div className="profile-step-main">
                  <div className="profile-step-heading">
                    <span className="answer-title">{a.title}</span>
                    <span className="answer-state">{getStateLabel(a)}</span>
                  </div>
                  <span className="profile-step-meta">{getStepMeta(a)}</span>
                </div>
                {canOpen && (
                  <Link className="profile-step-action" to={`/steps/${a.stepId}?marathonerId=${encodeURIComponent(data.id)}`}>Открыть</Link>
                )}
                {paymentBlocked && (
                  <a className="profile-step-action profile-step-action-muted" href="#vip-access">Варианты VIP</a>
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
