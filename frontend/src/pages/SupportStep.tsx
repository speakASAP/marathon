import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface StepInfo {
  id: string;
  title: string;
  sequence: number;
  assignmentContent: string | null;
  socialLink: string | null;
}

/**
 * Support view of one step: content only (no report tab, no other marathoners).
 */
export default function SupportStep() {
  const { stepId } = useParams<{ stepId: string }>();
  const [step, setStep] = useState<StepInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stepId) return;
    fetch(`/api/v1/steps/${encodeURIComponent(stepId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setStep(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stepId]);

  useEffect(() => {
    if (step) document.title = `Поддержка: ${step.title} — Marathon`;
  }, [step]);

  if (loading && !step) return <div className="container"><p>Загрузка…</p></div>;
  if (!stepId || (!loading && !step)) {
    return (
      <div className="container">
        <p>Этап не найден.</p>
        <Link to="/support">← Поддержка</Link>
      </div>
    );
  }
  if (!step) return null;
  const assignmentContent = step.assignmentContent?.trim();

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/support">Поддержка</Link>
      </nav>
      <h1>{step.title}</h1>
      {assignmentContent ? (
        <div className="step-assignment-content">{assignmentContent}</div>
      ) : (
        <div className="step-content-missing" role="alert">
          Assignment content is not configured for this step.
        </div>
      )}
      {step.socialLink && (
        <a className="step-resource-link" href={step.socialLink} target="_blank" rel="noopener noreferrer">
          Open supporting material
        </a>
      )}
    </div>
  );
}
