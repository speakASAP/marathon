import { useState, FormEvent } from 'react';
import { clearToken, getToken, redirectToLogin } from '../auth';

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
      const token = getToken();
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch('/api/v1/registrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          languageCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) {
        clearToken();
        onError?.('Registration session expired. Sign in again to bind this marathon to your profile.');
        redirectToLogin(`/${languageCode}/#register`);
        return;
      }
      if (!res.ok) {
        onError?.(data.message || data.detail || `Ошибка ${res.status}`);
        setSubmitting(false);
        return;
      }
      const marathonerId = typeof data.marathonerId === 'string' ? data.marathonerId : '';
      onSuccess?.(marathonerId, data.redirectUrl);
      if (marathonerId) {
        const profilePath = `/profile/${encodeURIComponent(marathonerId)}`;
        if (token && data.userBound === true) {
          window.location.href = profilePath;
        } else {
          redirectToLogin(profilePath);
        }
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
      <h4>Register for Marathon</h4>
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
      <p className="landing-form-note">Secure Marathon registration. No payment is required to start.</p>
    </form>
  );
}
