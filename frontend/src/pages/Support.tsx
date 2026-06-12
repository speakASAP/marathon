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

interface MarathonAnalytics {
  generatedAt: string;
  catalog: {
    ready: boolean;
    registrationOpen: boolean;
    paymentReady: boolean;
    giftReady: boolean;
    assignmentReady: boolean;
    counts: {
      activeMarathons: number;
      marathons: number;
      products: number;
      gifts: number;
      unusedGifts: number;
      steps: number;
      stepsWithContent: number;
    };
    missing: string[];
  };
  participants: {
    total: number;
    active: number;
    finished: number;
    vip: number;
    paymentBlocked: number;
  };
  assignments: {
    submissions: number;
    completed: number;
    penaltyReports: number;
    completionRate: number;
  };
  payments: {
    attempts: number;
    confirmed: number;
    conversionRate: number;
    statusCounts: Record<string, number>;
  };
  gifts: {
    total: number;
    used: number;
    unused: number;
    redemptionRate: number;
  };
  winners: {
    medalRows: number;
    gold: number;
    silver: number;
    bronze: number;
  };
}

/**
 * Support: list marathons and links to each step (support view).
 */
export default function Support() {
  const [marathons, setMarathons] = useState<Array<MarathonSummary & { steps: StepSummary[] }>>([]);
  const [analytics, setAnalytics] = useState<MarathonAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Поддержка — Marathon';
    Promise.all([
      fetch('/api/v1/marathons/analytics')
        .then((r) => {
          if (!r.ok) throw new Error(`analytics:${r.status}`);
          return r.json();
        })
        .then((data: MarathonAnalytics) => {
          setAnalytics(data);
          setAnalyticsError('');
        })
        .catch(() => {
          setAnalytics(null);
          setAnalyticsError('Operational analytics are temporarily unavailable.');
        }),
      fetch('/api/v1/marathons?active=true')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: MarathonSummary[]) => {
        if (!Array.isArray(list) || list.length === 0) {
          return [];
        }
        return Promise.all(
          list.map((m) =>
            fetch(`/api/v1/steps?marathonId=${encodeURIComponent(m.id)}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((steps: StepSummary[]) => ({ ...m, steps: steps || [] })),
          ),
        );
      })
      .then((withSteps) => setMarathons(withSteps))
      .catch(() => setMarathons([])),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page-static page-support">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Поддержка</h1>
      <p>Список марафонов и этапов (для поддержки).</p>
      <section className="support-analytics" aria-live="polite">
        <div className="support-analytics-heading">
          <h2>Operational dashboard</h2>
          {analytics && <span>Updated {new Date(analytics.generatedAt).toLocaleString('ru-RU')}</span>}
        </div>
        {analyticsError && <p className="ml-error">{analyticsError}</p>}
        {analytics ? (
          <>
            <div className="support-analytics-grid">
              <div><span>Registration</span><strong>{analytics.catalog.registrationOpen ? 'Open' : 'Closed'}</strong></div>
              <div><span>Active marathons</span><strong>{analytics.catalog.counts.activeMarathons}</strong></div>
              <div><span>Participants</span><strong>{analytics.participants.total}</strong></div>
              <div><span>VIP users</span><strong>{analytics.participants.vip}</strong></div>
              <div><span>Payment blocked</span><strong>{analytics.participants.paymentBlocked}</strong></div>
              <div><span>Completion</span><strong>{analytics.assignments.completionRate}%</strong></div>
              <div><span>Payment conversion</span><strong>{analytics.payments.conversionRate}%</strong></div>
              <div><span>Gift redemption</span><strong>{analytics.gifts.redemptionRate}%</strong></div>
              <div><span>Winners</span><strong>{analytics.winners.medalRows}</strong></div>
            </div>
            {!analytics.catalog.ready && (
              <div className="support-readiness-note">
                <strong>Launch gate:</strong>
                <span>{analytics.catalog.missing.length ? analytics.catalog.missing.join(', ') : 'waiting for catalog verification'}</span>
              </div>
            )}
          </>
        ) : !analyticsError ? (
          <p>Loading operational analytics...</p>
        ) : null}
      </section>
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
