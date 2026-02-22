import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface MarathonSummary {
  id: string;
  title: string;
}

interface StepSummary {
  id: string;
  title: string;
  sequence: number;
}

/**
 * Support: list marathons and links to each step (support view).
 */
export default function Support() {
  const [marathons, setMarathons] = useState<Array<MarathonSummary & { steps: StepSummary[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Поддержка — Marathon';
    fetch('/api/v1/marathons?active=true')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: MarathonSummary[]) => {
        if (!Array.isArray(list) || list.length === 0) {
          setLoading(false);
          return;
        }
        Promise.all(
          list.map((m) =>
            fetch(`/api/v1/steps?marathonId=${encodeURIComponent(m.id)}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((steps: StepSummary[]) => ({ ...m, steps: steps || [] })),
          ),
        ).then((withSteps) => {
          setMarathons(withSteps);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Поддержка</h1>
      <p>Список марафонов и этапов (для поддержки).</p>
      {loading && <p>Загрузка…</p>}
      {!loading && marathons.length === 0 && <p>Нет марафонов.</p>}
      {!loading && marathons.length > 0 && (
        <ul className="support-marathon-list">
          {marathons.map((m) => (
            <li key={m.id}>
              <strong>{m.title}</strong>
              {m.steps.length > 0 ? (
                <ul className="support-steps-list">
                  {m.steps.map((s) => (
                    <li key={s.id}>
                      <Link to={`/support/step/${s.id}`}>
                        {s.sequence}. {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <span> — этапов нет</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
