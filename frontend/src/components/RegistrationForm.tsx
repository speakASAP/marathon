import { useState, FormEvent } from 'react';
import { clearToken, getLoginUrl, getPasswordResetUrl, getRegistrationUrl, redirectToLogin } from '../auth';
import {
  MarathonRegistrationAuthExpiredError,
  MarathonRegistrationExistingAccountError,
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
  const [existingAccountMessage, setExistingAccountMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onError?.('Укажите email');
      return;
    }
    if (!phone.trim()) {
      onError?.('Укажите телефон');
      return;
    }
    setSubmitting(true);
    onError?.('');
    setExistingAccountMessage('');
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
      if (err instanceof MarathonRegistrationExistingAccountError) {
        setExistingAccountMessage(err.message);
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
        <label htmlFor="reg-phone">Телефон *</label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+420 ..."
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Отправка...' : 'Начать марафон'}
      </button>
      {existingAccountMessage && (
        <div className="landing-form-auth-panel" role="alert">
          <strong>{existingAccountMessage}</strong>
          <span>Войдите через единый аккаунт Alfares, чтобы привязать марафон к вашему профилю. Если пароль забыт, восстановите доступ.</span>
          <div>
            <a href={getLoginUrl(`/${languageCode}/#register`)} className="btn-profile-open">
              Войти с email или телефоном
            </a>
            <a href={getPasswordResetUrl()} className="btn-profile-login">
              Восстановить пароль
            </a>
          </div>
        </div>
      )}
      <a href={getLoginUrl('/profile')} className="landing-form-login-link">
        Войти через единый аккаунт
      </a>
      <a href={getRegistrationUrl(`/${languageCode}/#register`)} className="landing-form-login-link">
        Создать аккаунт в Alfares
      </a>
    </form>
  );
}
