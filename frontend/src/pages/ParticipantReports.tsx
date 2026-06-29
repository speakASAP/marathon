import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchParticipantReports, type PublicParticipantReports } from '../api/assignmentMarathon';
import PublicAnswerReport from '../components/assignment/PublicAnswerReport';
import { stripHeadingTerminalPeriod } from '../components/assignment/assignmentBlockNormalization';

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' в');
}

function participantInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'У';
}

function resolveReturnPath(next: string | null, fallbackStepId: string) {
  const fallbackPath = `/steps/${encodeURIComponent(fallbackStepId)}`;
  const normalizedNext = next?.trim() || '';

  if (normalizedNext.startsWith('/') && !normalizedNext.startsWith('//') && !/[\\\r\n]/.test(normalizedNext)) {
    return normalizedNext;
  }

  return fallbackPath;
}

export default function ParticipantReports() {
  const { participantId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const throughStepId = searchParams.get('throughStepId') || '';
  const nextPath = searchParams.get('next');
  const [data, setData] = useState<PublicParticipantReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!participantId || !throughStepId) {
      setData(null);
      setError('Профиль участника открывается из отчёта конкретного этапа.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    fetchParticipantReports(participantId, throughStepId)
      .then((reports) => {
        setData(reports);
        setError(reports ? '' : 'Участник или его отчёты не найдены.');
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setError('Отчёты участника временно не загрузились.');
        setLoading(false);
      });
  }, [participantId, throughStepId]);

  const reportCountLabel = useMemo(() => {
    const count = data?.reports.length || 0;
    if (count === 1) return '1 пройденный этап';
    if (count > 1 && count < 5) return `${count} пройденных этапа`;
    return `${count} пройденных этапов`;
  }, [data?.reports.length]);
  const returnPath = useMemo(
    () => resolveReturnPath(nextPath, data?.throughStep.id || throughStepId),
    [data?.throughStep.id, nextPath, throughStepId],
  );

  if (loading) {
    return <div className="container page-static participant-reports-page"><p>Загрузка…</p></div>;
  }

  if (!data) {
    return (
      <div className="container page-static participant-reports-page">
        <section className="profile-empty-panel" role="alert">
          <h1>Отчёты участника</h1>
          <p>{error || 'Отчёты участника не найдены.'}</p>
          <Link to="/profile" className="btn-profile-open">Мой марафон</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container page-static participant-reports-page">
      <section className="participant-reports-hero">
        {data.participant.avatar ? (
          <img src={data.participant.avatar} alt="" width={88} height={88} />
        ) : (
          <span className="participant-reports-avatar" aria-hidden="true">
            {participantInitial(data.participant.name)}
          </span>
        )}
        <div className="participant-reports-hero-main">
          <div className="participant-reports-hero-copy">
            <h1>{data.participant.name}</h1>
            <p>{data.marathon.title}: ответы до этапа {data.throughStep.sequence}, {data.throughStep.title}</p>
            <strong>{reportCountLabel}</strong>
          </div>
          <Link to={returnPath} className="participant-reports-back">
            Вернуться к этапу
          </Link>
        </div>
      </section>

      <section className="participant-reports-list" aria-label="Ответы участника по этапам">
        {data.reports.length ? data.reports.map((report) => (
          <article className="participant-report-card" key={report.id}>
            <header>
              <span>Этап {report.sequence}</span>
              <h2>{stripHeadingTerminalPeriod(report.title)}</h2>
              {formatReportDate(report.complete_time) && <small>{formatReportDate(report.complete_time)}</small>}
            </header>
            <PublicAnswerReport rows={report.rows} report={report.report} className="participant-report-body" />
          </article>
        )) : (
          <div className="step-peer-empty" aria-live="polite">
            <strong>Пока нет видимых отчётов</strong>
            <span>Здесь появятся только те ответы участника, которые относятся к этому и предыдущим этапам.</span>
          </div>
        )}
      </section>

      <footer className="participant-reports-footer">
        <Link to={returnPath} className="participant-reports-back">
          Вернуться к этапу
        </Link>
      </footer>
    </div>
  );
}
