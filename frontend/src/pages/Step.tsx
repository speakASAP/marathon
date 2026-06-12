import { useParams, Link } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { authFetch, redirectToLogin } from '../auth';

interface StepInfo {
  id: string;
  title: string;
  sequence: number;
  assignmentContent: string | null;
  formKey: string | null;
  socialLink: string | null;
}

interface RandomAnswer {
  marathoner: { name: string };
  report: string;
  complete_time: string;
}

/**
 * Step (task) page: tabs Задание / Отчет; other marathoners' results from GET /api/v1/answers/random.
 */
export default function Step() {
  const { stepId } = useParams<{ stepId: string }>();
  const [step, setStep] = useState<StepInfo | null>(null);
  const [loadingStep, setLoadingStep] = useState(true);
  const [tab, setTab] = useState<'task' | 'submit' | 'report'>('task');
  const [randomAnswer, setRandomAnswer] = useState<RandomAnswer | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [marathonerId, setMarathonerId] = useState('');
  const [report, setReport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!stepId) return;
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setStep(null);
    setRandomAnswer(null);
    setLoadingStep(true);
    fetch(`/api/v1/steps/${encodeURIComponent(stepId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setStep(data);
        setLoadingStep(false);
      })
      .catch(() => setLoadingStep(false));
  }, [stepId]);

  const loadRandomReport = () => {
    if (!stepId) return;
    setLoadingRandom(true);
    const params = new URLSearchParams({ stepId });
    if (marathonerId) params.set('excludeMarathonerId', marathonerId);
    fetch(`/api/v1/answers/random?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRandomAnswer(data);
        setLoadingRandom(false);
      })
      .catch(() => setLoadingRandom(false));
  };

  useEffect(() => {
    if (tab === 'report' && stepId) {
      loadRandomReport();
    }
  }, [tab, stepId, marathonerId]);

  useEffect(() => {
    if (step) document.title = `${step.title} — Marathon`;
  }, [step]);

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');
    if (!stepId) return;
    if (!marathonerId.trim()) {
      setSubmitError('Open this assignment from your marathon profile before sending a report.');
      return;
    }
    if (!report.trim()) {
      setSubmitError('Write your report before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId.trim())}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId,
          report: report.trim(),
          completed: true,
        }),
      });

      if (res.status === 401) {
        redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Submission failed (${res.status})`);
      }
      setSubmitMessage(body.is_late ? 'Report saved. It was marked late and one bonus day was used.' : 'Report saved. Your progress is now recorded.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const assignmentContent = step?.assignmentContent?.trim();

  if (loadingStep && !step) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!stepId || (!loadingStep && !step)) {
    return (
      <div className="container">
        <p>Этап не найден.</p>
        <Link to="/profile">Мои марафоны</Link>
      </div>
    );
  }

  return (
    <div className="container page-static page-step">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мои марафоны</Link>
      </nav>
      <h1>{step?.title ?? `Этап ${stepId}`}</h1>

      <div className="step-content-card">
      <div className="step-tabs">
        <button
          type="button"
          className={tab === 'task' ? 'active' : ''}
          onClick={() => setTab('task')}
        >
          Задание
        </button>
        <button
          type="button"
          className={tab === 'submit' ? 'active' : ''}
          onClick={() => setTab('submit')}
        >
          Мой отчет
        </button>
        <button
          type="button"
          className={tab === 'report' ? 'active' : ''}
          onClick={() => setTab('report')}
        >
          Отчет
        </button>
      </div>

      {tab === 'task' && (
        <section className="step-task">
          {assignmentContent ? (
            <div className="step-assignment-content">{assignmentContent}</div>
          ) : (
            <div className="step-content-missing" role="alert">
              Assignment content is not configured for this step. Contact support before submitting a report.
            </div>
          )}
          {step?.socialLink && (
            <a className="step-resource-link" href={step.socialLink} target="_blank" rel="noopener noreferrer">
              Open supporting material
            </a>
          )}
        </section>
      )}

      {tab === 'submit' && (
        <section className="step-submit">
          <h2>Мой отчет</h2>
          <p className="step-report-note">Write what you completed for this assignment. The platform records your progress and updates bonus-day status automatically.</p>
          <form onSubmit={submitReport} className="step-submit-form">
            <label htmlFor="step-report">Report</label>
            <textarea
              id="step-report"
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder="Describe your answer, links, notes, or practice result..."
              rows={8}
            />
            <button type="submit" className="btn-show-more" disabled={submitting}>
              {submitting ? 'Saving...' : 'Submit report'}
            </button>
          </form>
          {submitMessage && <p className="step-submit-success">{submitMessage}</p>}
          {submitError && <p className="ml-error">{submitError}</p>}
        </section>
      )}

      {tab === 'report' && (
        <section className="step-report">
          <h2>Результаты других марафонцев</h2>
          <p className="step-report-note">Пример отчёта участника по этому этапу (случайный выбор).</p>
          {loadingRandom && !randomAnswer && <p>Загрузка…</p>}
          {randomAnswer && (
            <div className="random-report">
              <p className="random-report-meta">
                {randomAnswer.marathoner.name}
                {randomAnswer.complete_time && (
                  <span> — {new Date(randomAnswer.complete_time).toLocaleString('ru-RU')}</span>
                )}
              </p>
              <div className="random-report-body">{randomAnswer.report}</div>
            </div>
          )}
          {!loadingRandom && randomAnswer && (
            <button type="button" className="btn-show-more" onClick={loadRandomReport}>
              Показать ещё
            </button>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
