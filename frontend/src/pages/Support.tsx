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
  surveys: {
    responses: number;
    promoters: number;
    passives: number;
    detractors: number;
    averageScore: number;
    npsScore: number;
  };
}

const CATALOG_RUNBOOK_STEPS = [
  {
    title: 'Prepare approved catalog JSON',
    detail: 'Use docs/schemas/marathon-catalog.schema.json and include only Marathon/Product/Gift/Step data.',
  },
  {
    title: 'Dry-run through the runtime pod',
    detail: 'npm run load:catalog:pod -- /path/to/catalog.json',
  },
  {
    title: 'Apply after approval',
    detail: 'npm run load:catalog:pod -- /path/to/catalog.json --apply',
  },
  {
    title: 'Verify launch readiness',
    detail: 'kubectl -n statex-apps exec deploy/marathon -- npm run check:readiness',
  },
];

const CATALOG_CONTRACT_LINKS = [
  { href: '/catalog/marathon-catalog.schema.json', label: 'JSON Schema' },
  { href: '/catalog/marathon-catalog.example.json', label: 'Example JSON' },
  { href: '/catalog/marathon-catalog.approval-checklist.md', label: 'Approval Checklist' },
  { href: '/api/v1/marathons/readiness', label: 'Readiness API' },
];

function formatMissingLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
              <div><span>NPS responses</span><strong>{analytics.surveys.responses}</strong></div>
              <div><span>NPS score</span><strong>{analytics.surveys.npsScore}</strong></div>
              <div><span>Avg. survey score</span><strong>{analytics.surveys.averageScore}</strong></div>
            </div>
            {!analytics.catalog.ready && (
              <section className="support-launch-runbook" aria-label="Launch unblocker">
                <div>
                  <strong>Launch gate</strong>
                  <p>
                    Registration, VIP checkout, gift redemption, and assignment verification stay closed until the approved catalog is loaded.
                  </p>
                </div>
                <div className="support-missing-grid" aria-label="Missing catalog classes">
                  {(analytics.catalog.missing.length ? analytics.catalog.missing : ['waiting-for-catalog-verification']).map((item) => (
                    <span key={item}>{formatMissingLabel(item)}</span>
                  ))}
                </div>
                <div className="support-contract-links" aria-label="Catalog contract links">
                  {CATALOG_CONTRACT_LINKS.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
                <ol className="support-runbook-list">
                  {CATALOG_RUNBOOK_STEPS.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <code>{step.detail}</code>
                    </li>
                  ))}
                </ol>
                <p className="support-runbook-note">
                  The pod helper removes the staged catalog copy after each run. Do not paste gift-code inventories, participant exports, JWTs, payment keys, or assignment reports into validation notes.
                </p>
              </section>
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
