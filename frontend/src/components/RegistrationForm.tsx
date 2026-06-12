import { useState, FormEvent } from 'react';

export interface RegistrationFormProps {
  languageCode: string;
  marathonTitle: string;
  onSuccess?: (marathonerId: string, redirectUrl?: string) => void;
  onError?: (message: string) => void;
}

/**
 * Registration form for marathon. POST /api/v1/registrations.
 */
export default function RegistrationForm({
  languageCode,
  marathonTitle,
  onSuccess,
  onError,
}: RegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onError?.('Укажите email');
      return;
    }
    setSubmitting(true);
    onError?.('');
    try {
      const res = await fetch('/api/v1/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          languageCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError?.(data.message || data.detail || `Ошибка ${res.status}`);
        setSubmitting(false);
        return;
      }
      onSuccess?.(data.marathonerId, data.redirectUrl);
      if (data.marathonerId) {
        window.location.href = `/profile/${encodeURIComponent(data.marathonerId)}`;
      } else if (data.redirectUrl) {
        const normalizedRedirect = String(data.redirectUrl).replace(/^(https?:\/\/[^/]+)?\/marathon\/([a-z]{2})\/?$/i, '$1/$2/');
        window.location.href = normalizedRedirect;
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="landing-form">
      <h4>Register for SpeakASAP Marathon</h4>
      <p className="landing-form-marathon">{marathonTitle}</p>
      <div>
        <label htmlFor="reg-email">Email *</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label htmlFor="reg-name">Name</label>
        <input
          id="reg-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="reg-phone">Phone</label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+420 ..."
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Sending...' : 'Start my marathon'}
      </button>
      <p className="landing-form-note">Secure registration. No payment is required to start.</p>
    </form>
  );
}
