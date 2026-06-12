import { useParams, Link } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { getToken, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchRandomAnswer,
  fetchSavedSubmission,
  fetchStepInfo,
  submitStepReport,
  type RandomAnswer,
  type SavedSubmission,
  type StepInfo,
} from '../api/assignmentMarathon';

/**
 * Step (task) page: tabs Задание / Отчет; other marathoners' results from GET /api/v1/answers/random.
 */
export default function Step() {
  const { stepId } = useParams<{ stepId: string }>();
  const [step, setStep] = useState<StepInfo | null>(null);
  const [loadingStep, setLoadingStep] = useState(true);
  const [stepNotFound, setStepNotFound] = useState(false);
  const [stepLoadError, setStepLoadError] = useState('');
  const [tab, setTab] = useState<'task' | 'submit' | 'report'>('task');
  const [randomAnswer, setRandomAnswer] = useState<RandomAnswer | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [marathonerId, setMarathonerId] = useState('');
  const [report, setReport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [savedSubmission, setSavedSubmission] = useState<SavedSubmission | null>(null);
  const [loadingSavedSubmission, setLoadingSavedSubmission] = useState(false);
  const [savedSubmissionError, setSavedSubmissionError] = useState('');
  const [submissionAuthRequired, setSubmissionAuthRequired] = useState(false);

  useEffect(() => {
    if (!stepId) return;
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setStep(null);
    setStepNotFound(false);
    setStepLoadError('');
    setRandomAnswer(null);
    setSavedSubmission(null);
    setSavedSubmissionError('');
    setSubmissionAuthRequired(false);
    setReport('');
    setLoadingStep(true);
    fetchStepInfo(stepId)
      .then((data) => {
        if (!data) {
          setStepNotFound(true);
          setLoadingStep(false);
          return;
        }
        setStep(data);
        setLoadingStep(false);
      })
      .catch(() => {
        setStepLoadError('Assignment could not be loaded. Refresh this page, or contact support if the problem continues.');
        setLoadingStep(false);
      });
  }, [stepId]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (!stepId || !participantId) return;
    setLoadingSavedSubmission(true);
    setSavedSubmissionError('');
    setSubmissionAuthRequired(false);
    if (!getToken()) {
      setSubmissionAuthRequired(true);
      setLoadingSavedSubmission(false);
      return;
    }
    fetchSavedSubmission(participantId, stepId)
      .then((data) => {
        setSavedSubmission(data);
        if (data.exists && typeof data.report === 'string') {
          setReport(data.report);
        }
        setLoadingSavedSubmission(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setSubmissionAuthRequired(true);
        } else {
          setSavedSubmissionError('Saved report status could not be loaded.');
        }
        setLoadingSavedSubmission(false);
      });
  }, [stepId, marathonerId]);

  const loadRandomReport = () => {
    if (!stepId) return;
    setLoadingRandom(true);
    fetchRandomAnswer(stepId, marathonerId)
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
    if (submissionAuthRequired || !getToken()) {
      redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
      return;
    }
    if (!assignmentContent) {
      setSubmitError('Assignment content is not configured. Submission is blocked until support adds approved assignment content.');
      return;
    }
    if (!report.trim()) {
      setSubmitError('Write your report before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const body = await submitStepReport(marathonerId.trim(), stepId, report.trim());
      setSavedSubmission({
        exists: true,
        id: body.id,
        report: report.trim(),
        state: body.state || 'completed',
        is_late: Boolean(body.is_late),
        bonus_left: typeof body.bonus_left === 'number' ? body.bonus_left : 0,
        updated_at: body.updated_at,
      });
      setSubmitMessage(body.is_late ? 'Report saved. It was marked late and one bonus day was used.' : 'Report saved. Your progress is now recorded.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      setSubmitError(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const assignmentContent = step?.assignmentContent?.trim();
  const hasParticipantContext = Boolean(marathonerId.trim());
  const stepReturnPath = stepId && hasParticipantContext
    ? `/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`
    : '/profile';
  const openLogin = () => redirectToLogin(stepReturnPath);
  const submitBlockedByStatusError = Boolean(savedSubmissionError);
  const submitDisabled = submitting
    || loadingSavedSubmission
    || submissionAuthRequired
    || !hasParticipantContext
    || !assignmentContent
    || submitBlockedByStatusError;
  const peerReportEmpty = tab === 'report' && !loadingRandom && !randomAnswer;

  if (loadingStep && !step) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (stepLoadError) {
    return (
      <div className="container page-static page-step">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
          <span> · </span>
          <Link to="/profile">Мои марафоны</Link>
        </nav>
        <h1>Assignment is temporarily unavailable</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{stepLoadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <a className="btn-profile-login" href="mailto:support@speakasap.com">
              Contact support
            </a>
          </div>
        </section>
      </div>
    );
  }

  if (!stepId || stepNotFound || (!loadingStep && !step)) {
    return (
      <div className="container page-static page-step">
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
          {loadingSavedSubmission && <p className="step-report-note">Checking saved report status...</p>}
          {savedSubmissionError && (
            <p className="ml-error">
              {savedSubmissionError} Submission is paused until this assignment status can be checked.
            </p>
          )}
          {!assignmentContent && (
            <div className="step-submit-auth-panel" role="alert">
              <strong>Assignment content is not configured</strong>
              <span>Submission is blocked until support adds approved assignment content for this step.</span>
              <Link to="/support" className="btn-profile-login">Contact support</Link>
            </div>
          )}
          {!hasParticipantContext && (
            <div className="step-submit-auth-panel" role="alert">
              <strong>Open this assignment from your marathon profile</strong>
              <span>The profile link includes the participant ID needed to save your report to the right marathon.</span>
              <Link to="/profile" className="btn-profile-login">Open profile</Link>
            </div>
          )}
          {hasParticipantContext && submissionAuthRequired && (
            <div className="step-submit-auth-panel" role="alert">
              <strong>Sign in to submit your report</strong>
              <span>Your report is saved only after the portal returns with a Marathon token for this participant.</span>
              <button type="button" className="btn-profile-login" onClick={openLogin}>Sign in</button>
            </div>
          )}
          {savedSubmission?.exists && (
            <div className="step-saved-report" aria-live="polite">
              <strong>{savedSubmission.state === 'completed' ? 'Saved report loaded' : 'Draft report loaded'}</strong>
              <span>
                {savedSubmission.updated_at && `Updated ${new Date(savedSubmission.updated_at).toLocaleString('ru-RU')}. `}
                Bonus days left: {savedSubmission.bonus_left}.
                {savedSubmission.is_late ? ' Marked late.' : ''}
              </span>
            </div>
          )}
          <form onSubmit={submitReport} className="step-submit-form">
            <label htmlFor="step-report">Report</label>
            <textarea
              id="step-report"
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder="Describe your answer, links, notes, or practice result..."
              rows={8}
              disabled={!hasParticipantContext || submissionAuthRequired || submitBlockedByStatusError || !assignmentContent}
            />
            <button type="submit" className="btn-show-more" disabled={submitDisabled}>
              {submitting ? 'Saving...' : submissionAuthRequired ? 'Sign in required' : 'Submit report'}
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
          {peerReportEmpty && (
            <div className="step-peer-empty" aria-live="polite">
              <strong>Пока нет примеров отчетов</strong>
              <span>
                Когда участники сохранят первые отчеты по этому этапу, здесь появится случайный пример
                для самопроверки. Ваш собственный отчет можно отправить во вкладке «Мой отчет».
              </span>
              <button type="button" className="btn-show-more" onClick={loadRandomReport}>
                Проверить еще раз
              </button>
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
