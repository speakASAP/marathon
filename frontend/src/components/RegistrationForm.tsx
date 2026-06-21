import { useState, FormEvent } from 'react';
import { clearToken, redirectToLogin } from '../auth';
import {
  MarathonRegistrationAuthExpiredError,
  normalizeRegistrationRedirectUrl,
  submitMarathonRegistration,
} from '../api/journeyMarathon';

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
      const data = await submitMarathonRegistration({
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        languageCode,
      });
      const { marathonerId } = data;
      onSuccess?.(marathonerId, data.redirectUrl);
      if (marathonerId) {
        const profilePath = `/profile/${encodeURIComponent(marathonerId)}`;
        if (data.tokenUsed && data.userBound === true) {
          window.location.href = profilePath;
        } else {
          redirectToLogin(profilePath);
        }
      } else if (data.redirectUrl) {
        window.location.href = normalizeRegistrationRedirectUrl(data.redirectUrl);
      }
    } catch (err) {
      if (err instanceof MarathonRegistrationAuthExpiredError) {
        clearToken();
        onError?.('Сессия регистрации истекла. Войдите снова, чтобы привязать марафон к вашему профилю.');
        redirectToLogin(`/${languageCode}/#register`);
        return;
      }
      onError?.(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="landing-form">
      <h4>Регистрация на марафон</h4>
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
        <label htmlFor="reg-name">Имя</label>
        <input
          id="reg-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
        />
      </div>
      <div>
        <label htmlFor="reg-phone">Телефон</label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+420 ..."
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Отправка...' : 'Начать марафон'}
      </button>
    </form>
  );
}
