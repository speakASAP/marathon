import { useEffect, useId, useMemo, useRef, useState, FormEvent } from 'react';
import {
  clearPendingRegistration,
  clearToken,
  getLoginUrl,
  getPasswordResetUrl,
  getPendingRegistration,
  getRegistrationUrl,
  getToken,
  redirectToLogin,
  savePendingRegistration,
} from '../auth';
import {
  MarathonRegistrationAuthExpiredError,
  MarathonRegistrationExistingAccountError,
  checkMarathonRegistrationAvailability,
  normalizeRegistrationRedirectUrl,
  submitMarathonRegistration,
  type RegistrationInput,
} from '../api/journeyMarathon';
import { formatLanguageFlag, formatLanguageLabel } from '../languages';
import type { MarathonLanguage } from '../api/publicMarathon';

export interface RegistrationFormProps {
  languageCode: string;
  marathonTitle: string;
  languages?: MarathonLanguage[];
  onSuccess?: (marathonerId: string, redirectUrl?: string) => void;
  onError?: (message: string) => void;
}

function getRegistrationReturnPath(languageCode: string): string {
  return `/${encodeURIComponent(languageCode)}/#register`;
}

/**
 * Registration form for marathon. POST /api/v1/registrations.
 */
export default function RegistrationForm({
  languageCode,
  marathonTitle,
  languages = [],
  onSuccess,
  onError,
}: RegistrationFormProps) {
  const initialPendingRegistration = getPendingRegistration(languageCode) || getPendingRegistration();
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(() => initialPendingRegistration?.languageCode || languageCode);
  const [email, setEmail] = useState(() => initialPendingRegistration?.email || '');
  const [name, setName] = useState(() => initialPendingRegistration?.name || '');
  const [phone, setPhone] = useState(() => initialPendingRegistration?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [existingAccountMessage, setExistingAccountMessage] = useState('');
  const [existingAccountLoginPath, setExistingAccountLoginPath] = useState('');
  const [handoffMessage, setHandoffMessage] = useState('');
  const [authenticatedStatus, setAuthenticatedStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'available'>('idle');
  const availabilityRequestRef = useRef(0);
  const autoSubmitRef = useRef(false);
  const didSyncLanguagePropRef = useRef(false);
  const languagePickerName = `marathon-language-${useId()}`;

  useEffect(() => {
    if (didSyncLanguagePropRef.current) {
      setSelectedLanguageCode(languageCode);
      return;
    }
    didSyncLanguagePropRef.current = true;
  }, [languageCode]);

  const selectableLanguages = useMemo(() => {
    const byCode = new Map<string, MarathonLanguage>();
    languages.forEach((language) => {
      if (language.code) byCode.set(language.code.toLowerCase(), language);
    });
    if (!byCode.has(languageCode.toLowerCase())) {
      byCode.set(languageCode.toLowerCase(), { code: languageCode, name: marathonTitle });
    }
    return [...byCode.values()].sort((a, b) =>
      formatLanguageLabel(a.code, a.name).localeCompare(formatLanguageLabel(b.code, b.name), 'ru'),
    );
  }, [languageCode, languages, marathonTitle]);

  const selectedLanguage = selectableLanguages.find((language) => language.code === selectedLanguageCode);
  const selectedLanguageTitle = selectedLanguage
    ? formatLanguageLabel(selectedLanguage.code, selectedLanguage.name)
    : marathonTitle;

  const getAuthPrefill = (input?: Partial<RegistrationInput>) => ({
    email: input?.email || email.trim() || undefined,
    phone: input?.phone || phone.trim() || undefined,
    identifier: input?.email || email.trim() || input?.phone || phone.trim() || undefined,
  });

  const emailReadyForLookup = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const phoneReadyForLookup = (value: string) => value.replace(/\D/g, '').length >= 7;

  const storePendingRegistration = (input: RegistrationInput) => {
    savePendingRegistration({
      email: input.email || '',
      phone: input.phone || '',
      name: input.name,
      languageCode: input.languageCode,
      returnPath: getRegistrationReturnPath(input.languageCode),
    });
  };

  const finishRegistration = async (input: RegistrationInput, source: 'form' | 'auth-handoff' | 'authenticated' = 'form') => {
    setSubmitting(true);
    if (source === 'authenticated') {
      setAuthenticatedStatus('submitting');
    }
    onError?.('');
    setExistingAccountMessage('');
    setExistingAccountLoginPath('');
    if (source === 'auth-handoff') {
      setHandoffMessage('Вход выполнен. Завершаем регистрацию на выбранный марафон...');
    } else if (source === 'authenticated') {
      setHandoffMessage('Проверяем ваш профиль и открываем выбранный марафон...');
    } else {
      setHandoffMessage('');
    }

    try {
      const data = await submitMarathonRegistration(input);
      const { marathonerId } = data;
      clearPendingRegistration();
      onSuccess?.(marathonerId, data.redirectUrl);
      if (marathonerId) {
        const profilePath = `/profile/${encodeURIComponent(marathonerId)}`;
        if (data.tokenUsed && data.userBound === true) {
          window.location.href = profilePath;
        } else {
          redirectToLogin(profilePath, getAuthPrefill(input));
        }
      } else if (data.redirectUrl) {
        window.location.href = normalizeRegistrationRedirectUrl(data.redirectUrl);
      }
    } catch (err) {
      if (source === 'authenticated') {
        setAuthenticatedStatus('error');
      }
      if (err instanceof MarathonRegistrationAuthExpiredError) {
        clearToken();
        storePendingRegistration(input);
        onError?.('Сессия регистрации истекла. Войдите снова, чтобы привязать марафон к вашему профилю.');
        redirectToLogin(getRegistrationReturnPath(input.languageCode), getAuthPrefill(input));
        return;
      }
      if (err instanceof MarathonRegistrationExistingAccountError) {
        storePendingRegistration(input);
        setExistingAccountLoginPath(getRegistrationReturnPath(input.languageCode));
        setExistingAccountMessage(err.message);
        return;
      }
      onError?.(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      availabilityRequestRef.current += 1;
      setAvailabilityStatus('idle');
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const canCheckEmail = emailReadyForLookup(normalizedEmail);
    const canCheckPhone = phoneReadyForLookup(normalizedPhone);

    if (!canCheckEmail && !canCheckPhone) {
      availabilityRequestRef.current += 1;
      setAvailabilityStatus('idle');
      return;
    }

    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;
    setAvailabilityStatus('checking');

    const timer = window.setTimeout(() => {
      void checkMarathonRegistrationAvailability({
        email: canCheckEmail ? normalizedEmail : undefined,
        phone: canCheckPhone ? normalizedPhone : undefined,
        languageCode: selectedLanguageCode,
      })
        .then((result) => {
          if (availabilityRequestRef.current !== requestId) return;
          if (result.registered) {
            setExistingAccountLoginPath(getRegistrationReturnPath(selectedLanguageCode));
            setExistingAccountMessage(result.message || 'Этот email или телефон уже зарегистрирован.');
            setAvailabilityStatus('idle');
            return;
          }
          setExistingAccountMessage('');
          setExistingAccountLoginPath('');
          setAvailabilityStatus('available');
        })
        .catch(() => {
          if (availabilityRequestRef.current !== requestId) return;
          setAvailabilityStatus('idle');
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [email, phone, selectedLanguageCode]);

  useEffect(() => {
    if (!getToken() || autoSubmitRef.current) return;
    const pending = getPendingRegistration(selectedLanguageCode);
    autoSubmitRef.current = true;
    if (pending) {
      setEmail(pending.email);
      setName(pending.name || '');
      setPhone(pending.phone);
      void finishRegistration({
        email: pending.email,
        name: pending.name,
        phone: pending.phone,
        languageCode: pending.languageCode,
      }, 'auth-handoff');
      return;
    }

    void finishRegistration({ languageCode: selectedLanguageCode }, 'authenticated');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguageCode]);

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
    if (existingAccountMessage) {
      onError?.('Этот email или телефон уже зарегистрирован. Войдите через единый аккаунт Alfares.');
      return;
    }
    await finishRegistration({
      email: email.trim(),
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      languageCode: selectedLanguageCode,
    });
  };

  const loginPath = existingAccountLoginPath || getRegistrationReturnPath(selectedLanguageCode);
  const saveCurrentPendingRegistration = () => {
    savePendingRegistration({
      email: email.trim(),
      phone: phone.trim(),
      name: name.trim() || undefined,
      languageCode: selectedLanguageCode,
      returnPath: getRegistrationReturnPath(selectedLanguageCode),
    });
  };
  const isAuthenticated = Boolean(getToken());

  if (isAuthenticated) {
    return (
      <section className="landing-form landing-form-authenticated" aria-live="polite">
        <h4>Регистрация на марафон</h4>
        <p className="landing-form-marathon">{selectedLanguageTitle} язык</p>
        <p className="landing-form-handoff" role="status">
          {authenticatedStatus === 'error'
            ? 'Не удалось открыть марафон автоматически. Обновите страницу или войдите снова.'
            : handoffMessage || 'Проверяем ваш профиль и открываем выбранный марафон...'}
        </p>
        {authenticatedStatus === 'error' && (
          <div className="landing-form-auth-panel" role="alert">
            <span>Если этот марафон уже есть в вашем аккаунте, откройте профиль. Если сессия устарела, войдите снова.</span>
            <div>
              <a href="/profile" className="btn-profile-open">Открыть профиль</a>
              <a href={getLoginUrl(getRegistrationReturnPath(languageCode))} className="btn-profile-login">Войти снова</a>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="landing-form">
      <h4>Регистрация на марафон</h4>
      <p className="landing-form-marathon">{selectedLanguageTitle} язык</p>
      {selectableLanguages.length > 1 && (
        <fieldset className="landing-form-language-picker" aria-label="Язык марафона">
          <legend>Выберите язык марафона</legend>
          <div>
            {selectableLanguages.map((language) => {
              const code = language.code;
              const label = formatLanguageLabel(code, language.name);
              return (
                <label key={code} className={selectedLanguageCode === code ? 'is-selected' : undefined}>
                  <input
                    type="radio"
                    name={languagePickerName}
                    value={code}
                    checked={selectedLanguageCode === code}
                    onChange={() => setSelectedLanguageCode(code)}
                  />
                  <span aria-hidden="true">{formatLanguageFlag(code)}</span>
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {handoffMessage && <p className="landing-form-handoff" role="status">{handoffMessage}</p>}
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
      {availabilityStatus === 'checking' && (
        <p className="landing-form-check-message" role="status">Проверяем email и телефон...</p>
      )}
      <button type="submit" disabled={submitting || availabilityStatus === 'checking' || Boolean(existingAccountMessage)}>
        {submitting ? 'Отправка...' : 'Начать марафон'}
      </button>
      {existingAccountMessage && (
        <div className="landing-form-auth-panel" role="alert">
          <strong>{existingAccountMessage}</strong>
          <span>Войдите через единый аккаунт Alfares. Мы вернем вас к выбранному марафону или откроем уже созданный профиль участника.</span>
          <div>
            <a href={getLoginUrl(loginPath, getAuthPrefill())} className="btn-profile-open" onClick={saveCurrentPendingRegistration}>
              Войти с email или телефоном
            </a>
            <a href={getPasswordResetUrl()} className="btn-profile-login">
              Восстановить пароль
            </a>
          </div>
        </div>
      )}
      <a href={getLoginUrl(getRegistrationReturnPath(selectedLanguageCode), getAuthPrefill())} className="landing-form-login-link" onClick={saveCurrentPendingRegistration}>
        Войти через единый аккаунт
      </a>
      <a href={getRegistrationUrl(getRegistrationReturnPath(selectedLanguageCode), getAuthPrefill())} className="landing-form-login-link">
        Создать аккаунт в Alfares
      </a>
    </form>
  );
}
