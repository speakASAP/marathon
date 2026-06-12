import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { authFetch, redirectToLogin } from '../auth';

interface Answer {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
  block_reason?: string | null;
}

interface MyMarathon {
  id: string;
  title: string;
  type: string;
  needs_payment: boolean;
  bonus_left: number;
  bonus_total: number;
  can_change_report_time: boolean;
  report_time: string | null;
  current_step: Answer | null;
  answers: Answer[];
  finished_at: string | null;
  nps_survey: NpsSurvey | null;
}

interface NpsSurvey {
  score: number;
  comment: string | null;
  submitted_at: string;
}

interface ProgressReport {
  generatedAt: string;
  participant: {
    id: string;
    name: string | null;
    email: string | null;
    active: boolean;
    registeredAt: string;
    finishedAt: string | null;
  };
  marathon: {
    id: string;
    title: string;
    languageCode: string;
    slug: string;
  };
  access: {
    type: string;
    needsPayment: boolean;
    vipRequired: boolean;
    paymentReported: boolean;
    bonusDaysLeft: number;
    bonusDaysTotal: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    checkedSteps: number;
    activeSteps: number;
    lockedSteps: number;
    lateSteps: number;
    trialSteps: number;
    gatedSteps: number;
    completionPercent: number;
    penaltyReports: number;
    paymentAttempts: number;
  };
  currentStep: {
    title: string;
    state: string;
    isLate: boolean;
    blockReason?: string | null;
  } | null;
  steps: Array<{
    stepId: string;
    sequence: number;
    title: string;
    state: string;
    isTrialStep: boolean;
    isLate: boolean;
    submittedAt: string | null;
    blockReason?: string | null;
  }>;
  paymentAttempts: Array<{
    orderId: string;
    status: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    createdAt: string;
    confirmedAt: string | null;
  }>;
}

type PaymentReturnState = 'success' | 'cancelled' | null;

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
  if (answer.is_late) return 'Late';
  if (answer.state === 'completed' || answer.state === 'done') return 'Done';
  if (answer.state === 'checked') return 'Checked';
  if (answer.state === 'active') return 'Active';
  return 'Locked';
}

function getStepMeta(answer: Answer) {
  if (answer.block_reason === 'payment_required') {
    return 'VIP access is required to open this assignment.';
  }
  if (answer.state === 'inactive') {
    return 'Unlocks after the previous assignment is completed.';
  }
  if (answer.state === 'completed' || answer.state === 'done') {
    return `Saved ${formatDateTime(answer.stop)}.`;
  }
  return `${answer.is_late ? 'Late. ' : ''}Due ${formatDateTime(answer.stop)}.`;
}

function getCheckoutRedirectUrl(body: unknown) {
  const payload = body as {
    redirectUrl?: unknown;
    payment?: { data?: { redirectUrl?: unknown }; redirectUrl?: unknown };
  };
  const rawUrl = payload.redirectUrl ?? payload.payment?.data?.redirectUrl ?? payload.payment?.redirectUrl;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.href;
  } catch {
    return '';
  }
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
    authFetch(`/api/v1/me/marathons/${marathonerId}`)
      .then((r) => {
        if (r.status === 401) {
          setUnauth(true);
          setLoading(false);
          return null;
        }
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Marathon profile could not be loaded. Refresh this page, or contact support if the problem continues.');
        setLoading(false);
      });
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `${data.title} — Marathon`;
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
    redirectToLogin(`/profile/${marathonerId}`);
    return <div className="container"><p>Перенаправление на вход…</p></div>;
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
          <span> · </span>
          <Link to="/profile">Мои марафоны</Link>
        </nav>
        <h1>Marathon profile is temporarily unavailable</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <Link to="/support" className="btn-profile-login">Contact support</Link>
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
  const paymentReturnTitle = paymentReturn === 'success'
    ? (data.needs_payment ? 'Payment confirmation is processing' : 'VIP access is active')
    : 'Payment was cancelled';
  const paymentReturnBody = paymentReturn === 'success'
    ? (data.needs_payment
      ? 'The payment provider returned you here. We are waiting for the secure callback to confirm VIP access; refresh this page in a moment if the gate is still visible.'
      : 'Your payment has been confirmed and the next VIP assignments are available from this profile.')
    : 'No charge was completed. You can reopen checkout, use a gift code, or contact support from this page.';

  const startCheckout = async () => {
    if (!data) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await authFetch('/api/v1/vip/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marathonerId: data.id }),
      });
      if (res.status === 401) {
        redirectToLogin(`/profile/${data.id}#vip-access`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Checkout failed (${res.status})`);
      }
      const redirectUrl = getCheckoutRedirectUrl(body);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError('Checkout was created, but no valid payment redirect URL was returned.');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const loadProgressReport = async () => {
    if (!data) return;
    setReportLoading(true);
    setReportError('');
    try {
      const res = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(data.id)}/progress-report`);
      if (res.status === 401) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Progress report failed (${res.status})`);
      }
      setReport(body);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Progress report could not be generated');
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
      setNpsError('Choose a score from 0 to 10.');
      return;
    }
    setNpsSaving(true);
    setNpsError('');
    setNpsMessage('');
    try {
      const res = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(data.id)}/nps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: npsScore, comment: npsComment }),
      });
      if (res.status === 401) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Feedback failed (${res.status})`);
      }
      setData({ ...data, nps_survey: body });
      setNpsMessage('Thank you. Your marathon feedback was saved.');
    } catch (error) {
      setNpsError(error instanceof Error ? error.message : 'Feedback could not be saved');
    } finally {
      setNpsSaving(false);
    }
  };

  return (
    <div className="container page-static profile-dashboard">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мои марафоны</Link>
      </nav>
      <section className="profile-hero-panel">
        <div>
          <h1>{data.title}</h1>
          <p className="profile-meta">
            {data.type === 'trial' && 'Пробный период. '}
            Бонусных дней: {data.bonus_left} из {data.bonus_total}.
          </p>
        </div>
        <div className="profile-progress-card">
          <span>Progress</span>
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
              Refresh status
            </button>
          )}
        </section>
      )}
      {data.needs_payment && (
        <section className="profile-payment-panel" id="vip-access">
          <div>
            <h2>VIP access required</h2>
            <p>The VIP gate is active for this marathon. Pay securely or redeem a gift code to unlock the next assignments.</p>
            {checkoutError && <p className="ml-error">{checkoutError}</p>}
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={startCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? 'Opening checkout...' : 'Pay for VIP'}
            </button>
            <Link to={`/gift?marathonerId=${encodeURIComponent(data.id)}`} className="btn-profile-open">Gift code</Link>
            <Link to="/support" className="btn-profile-login">Contact support</Link>
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
            <h2>Marathon feedback</h2>
            <p>Your private score helps us improve future marathon assignments and support.</p>
          </div>
          <form onSubmit={submitNps} className="profile-nps-form">
            <fieldset>
              <legend>How likely are you to recommend this marathon?</legend>
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
            <label htmlFor="nps-comment">What should we improve?</label>
            <textarea
              id="nps-comment"
              value={npsComment}
              onChange={(event) => setNpsComment(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Optional private note for the Marathon team"
            />
            <div className="profile-payment-actions">
              <button type="submit" className="btn-profile-open" disabled={npsSaving || npsScore === null}>
                {npsSaving ? 'Saving...' : data.nps_survey ? 'Update feedback' : 'Save feedback'}
              </button>
              {data.nps_survey && <span className="profile-nps-saved">Saved {formatDateTime(data.nps_survey.submitted_at)}</span>}
            </div>
            {npsMessage && <p className="step-submit-success">{npsMessage}</p>}
            {npsError && <p className="ml-error">{npsError}</p>}
          </form>
        </section>
      )}
      <section className="profile-report-panel">
        <div className="profile-report-heading">
          <div>
            <h2>Progress report</h2>
            <p>Assignment, VIP, bonus-day, and payment-attempt summary for this marathon.</p>
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={loadProgressReport} disabled={reportLoading}>
              {reportLoading ? 'Generating...' : 'Generate report'}
            </button>
            {report && (
              <button type="button" className="btn-profile-login" onClick={downloadProgressReport}>
                Download JSON
              </button>
            )}
          </div>
        </div>
        {reportError && <p className="ml-error">{reportError}</p>}
        {report && (
          <div className="profile-report-summary" aria-live="polite">
            <div><span>Completed</span><strong>{report.summary.completedSteps}/{report.summary.totalSteps}</strong></div>
            <div><span>Checked</span><strong>{report.summary.checkedSteps}</strong></div>
            <div><span>Late</span><strong>{report.summary.lateSteps}</strong></div>
            <div><span>Bonus left</span><strong>{report.access.bonusDaysLeft}/{report.access.bonusDaysTotal}</strong></div>
            <div><span>VIP</span><strong>{report.access.needsPayment ? 'Required' : report.access.type.toUpperCase()}</strong></div>
            <div><span>Payments</span><strong>{report.summary.paymentAttempts}</strong></div>
            {report.currentStep && (
              <div className="profile-report-current">
                <span>Current step</span>
                <strong>{report.currentStep.title}</strong>
              </div>
            )}
          </div>
        )}
      </section>
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
                  <a className="profile-step-action profile-step-action-muted" href="#vip-access">VIP options</a>
                )}
                {!canOpen && !paymentBlocked && (
                  <span className="profile-step-action profile-step-action-disabled">Locked</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
