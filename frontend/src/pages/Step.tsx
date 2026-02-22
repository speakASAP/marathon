import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface StepInfo {
  id: string;
  title: string;
  sequence: number;
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
  const [tab, setTab] = useState<'task' | 'report'>('task');
  const [randomAnswer, setRandomAnswer] = useState<RandomAnswer | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [excludeMarathonerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!stepId) return;
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
    if (excludeMarathonerId) params.set('excludeMarathonerId', excludeMarathonerId);
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
  }, [tab, stepId]);

  useEffect(() => {
    if (step) document.title = `${step.title} — Marathon`;
  }, [step]);

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
          className={tab === 'report' ? 'active' : ''}
          onClick={() => setTab('report')}
        >
          Отчет
        </button>
      </div>

      {tab === 'task' && (
        <section className="step-task">
          <p>Содержание задания для этого этапа. Отчёт сдаётся в разделе «Отчет» или в настройках марафона.</p>
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
              <div
                className="random-report-body"
                dangerouslySetInnerHTML={{ __html: randomAnswer.report }}
              />
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
  );
}
