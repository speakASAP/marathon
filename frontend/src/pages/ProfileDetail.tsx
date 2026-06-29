import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getLoginUrl, getPasswordResetUrl, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  MarathonNotFoundError,
  createPaymentCheckout,
  fetchMyMarathon,
  fetchMyProfile,
  reconcilePaymentStatus,
  saveNpsSurvey,
  type Answer,
  type PaymentMethod,
  type MyMarathon,
  type MarathonUserProfileSettings,
} from '../api/profileMarathon';
import { stripHeadingTerminalPeriod } from '../components/assignment/assignmentBlockNormalization';

type PaymentReturnState = 'success' | 'cancelled' | null;
type MedalKind = 'gold' | 'silver' | 'bronze';

const MEDAL_LABELS: Record<MedalKind, { title: string; prize: string; detail: string }> = {
  gold: {
    title: 'Золотой финалист',
    prize: 'Ваш приз: золотая медаль',
    detail: 'Марафон завершен без потери штрафного круга и бонусных дней.',
  },
  silver: {
    title: 'Серебряный финалист',
    prize: 'Ваш приз: серебряная медаль',
    detail: 'Марафон завершен с сохраненными бонусными днями.',
  },
  bronze: {
    title: 'Бронзовый финалист',
    prize: 'Ваш приз: бронзовая медаль',
    detail: 'Марафон завершен. Приз зафиксирован в вашем профиле.',
  },
};

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string; detail: string; disabled?: boolean }> = [
  { value: 'paypal', label: 'Оплата через аккаунт PayPal', detail: 'Оплата через аккаунт PayPal.' },
  { value: 'card', label: 'Оплата банковской картой', detail: 'Visa, Mastercard или другая банковская карта через защищенный Stripe Checkout.' },
  {
    value: 'fiobanka',
    label: 'Банковский перевод',
    detail: 'Откроется QR для оплаты из банковского приложения в Чехии. Работает только для оплаты по Чехии.',
  },
];

const BOOK_PRIZE_URL = 'https://speakasap.com/media/steps/german/tochka_vixoda_iz_yazika_ili_kak_brosit_ychit_yazik_buch.pdf';

const AWARD_LANGUAGE_COPY: Record<string, { dative: string; hashtag: string; nextStep: string }> = {
  en: { dative: 'английскому', hashtag: '#english_speakASAP', nextStep: 'Скидка на следующий английский курс SpeakASAP' },
  de: { dative: 'немецкому', hashtag: '#german_speakASAP', nextStep: 'Скидка на следующий немецкий курс SpeakASAP' },
  es: { dative: 'испанскому', hashtag: '#spanish_speakASAP', nextStep: 'Скидка на следующий испанский курс SpeakASAP' },
  fr: { dative: 'французскому', hashtag: '#french_speakASAP', nextStep: 'Скидка на следующий французский курс SpeakASAP' },
  it: { dative: 'итальянскому', hashtag: '#italian_speakASAP', nextStep: 'Скидка на следующий итальянский курс SpeakASAP' },
  cz: { dative: 'чешскому', hashtag: '#czech_speakASAP', nextStep: 'Скидка на следующий чешский курс SpeakASAP' },
  tr: { dative: 'турецкому', hashtag: '#turkish_speakASAP', nextStep: 'Скидка на следующий турецкий курс SpeakASAP' },
  pt: { dative: 'португальскому', hashtag: '#portuguese_speakASAP', nextStep: 'Скидка на следующий португальский курс SpeakASAP' },
  nl: { dative: 'нидерландскому', hashtag: '#dutch_speakASAP', nextStep: 'Скидка на следующий нидерландский курс SpeakASAP' },
  pl: { dative: 'польскому', hashtag: '#polish_speakASAP', nextStep: 'Скидка на следующий польский курс SpeakASAP' },
  no: { dative: 'норвежскому', hashtag: '#norwegian_speakASAP', nextStep: 'Скидка на следующий норвежский курс SpeakASAP' },
  se: { dative: 'шведскому', hashtag: '#swedish_speakASAP', nextStep: 'Скидка на следующий шведский курс SpeakASAP' },
  dk: { dative: 'датскому', hashtag: '#danish_speakASAP', nextStep: 'Скидка на следующий датский курс SpeakASAP' },
};

const AWARD_LANGUAGE_ALIASES: Record<string, string> = {
  cs: 'cz',
  nb: 'no',
  nn: 'no',
  sv: 'se',
  da: 'dk',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function resolveParticipantName(profile: MarathonUserProfileSettings | null) {
  return profile?.displayName?.trim() || profile?.email?.trim() || 'Финалист SpeakASAP';
}

function resolveAwardLanguageCopy(code: string) {
  const normalized = code.toLowerCase();
  return AWARD_LANGUAGE_COPY[AWARD_LANGUAGE_ALIASES[normalized] || normalized] || {
    dative: 'выбранному',
    hashtag: '#speakASAP_marathon',
    nextStep: 'Скидка на следующий курс SpeakASAP',
  };
}

function makeShareLinks(text: string, url: string) {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}


function getStateLabel(answer: Answer) {
  if (answer.block_reason === 'payment_required') return 'Оплата';
  if (answer.is_late) return 'Поздно';
  if (answer.state === 'completed' || answer.state === 'done') return 'Готово';
  if (answer.state === 'checked') return 'Проверено';
  if (answer.state === 'active') return 'Активно';
  return 'Закрыто';
}

function getStepMeta(answer: Answer) {
  if (answer.block_reason === 'payment_required') {
    return 'Для открытия задания нужна оплата марафона.';
  }
  if (answer.state === 'inactive') {
    if (answer.is_scheduled_future) {
      return `По расписанию: ${formatDateTime(answer.start)}. Можно открыть заранее.`;
    }
    return 'Откроется после выполнения предыдущего задания. Можно открыть заранее.';
  }
  if (answer.state === 'completed' || answer.state === 'done') {
    return `Сохранено ${formatDateTime(answer.stop)}.`;
  }
  return `${answer.is_late ? 'Поздно. ' : ''}Срок: ${formatDateTime(answer.stop)}.`;
}

function getStepStatusText(answer: Answer) {
  const label = getStateLabel(answer);
  const meta = getStepMeta(answer);
  return label === 'Поздно' && meta.startsWith('Поздно.')
    ? meta
    : `${label} · ${meta}`;
}

/**
 * My marathon detail: GET /api/v1/me/marathons/:marathonerId (Bearer).
 * Shows current step, progress, link to step page.
 */
export default function ProfileDetail() {
  const { marathonerId } = useParams<{ marathonerId: string }>();
  const [data, setData] = useState<MyMarathon | null>(null);
  const [profile, setProfile] = useState<MarathonUserProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paypal');
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  const [paymentStatusError, setPaymentStatusError] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState('');
  const [npsSaving, setNpsSaving] = useState(false);
  const [npsMessage, setNpsMessage] = useState('');
  const [npsError, setNpsError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get('payment');
    if (payment === 'success') setPaymentReturn('success');
    if (payment === 'cancelled' || payment === 'cancel') setPaymentReturn('cancelled');
  }, []);

  useEffect(() => {
    if (!marathonerId) return;
    setLoading(true);
    setUnauth(false);
    setNotFound(false);
    setLoadError('');
    Promise.all([fetchMyMarathon(marathonerId), fetchMyProfile()])
      .then(([marathonData, profileData]) => {
        setData(marathonData);
        setProfile(profileData);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setUnauth(true);
        } else if (error instanceof MarathonNotFoundError) {
          setNotFound(true);
        } else {
          setLoadError('Профиль марафона не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        }
        setLoading(false);
      });
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `${data.title} — Марафон`;
    if (data?.nps_survey) {
      setNpsScore(data.nps_survey.score);
      setNpsComment(data.nps_survey.comment || '');
    } else if (data) {
      setNpsScore(null);
      setNpsComment('');
    }
  }, [data]);

  useEffect(() => {
    if (paymentReturn !== 'success' || !data?.payment_required) return undefined;

    let stopped = false;
    let timer: number | undefined;

    const refreshPaymentStatus = async () => {
      try {
        await reconcilePaymentStatus(data.id);
        const nextData = await fetchMyMarathon(data.id);
        if (stopped) return;
        setData(nextData);
        if (!nextData.payment_required) {
          setCheckoutError('');
          setPaymentStatusError('');
          return;
        }
        timer = window.setTimeout(refreshPaymentStatus, 3_000);
      } catch (error) {
        if (stopped) return;
        if (error instanceof MarathonAuthRequiredError) {
          redirectToLogin(`/profile/${data.id}`);
          return;
        }
        setPaymentStatusError('Не удалось обновить статус оплаты. Мы продолжим проверку автоматически.');
        timer = window.setTimeout(refreshPaymentStatus, 6_000);
      }
    };

    refreshPaymentStatus();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentReturn, data?.id, data?.payment_required]);

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="container page-static">
        <h1>Войдите в профиль марафона</h1>
        <section className="profile-empty-panel" role="alert">
          <p>
            Этот профиль уже должен быть привязан к единому аккаунту Alfares. Войдите через центральный вход,
            затем мы вернем вас на эту страницу.
          </p>
          <div className="profile-payment-actions">
            <a className="btn-profile-open" href={getLoginUrl(`/profile/${marathonerId}`)}>
              Войти с email или телефоном
            </a>
            <a className="btn-profile-login" href={getPasswordResetUrl()}>Восстановить пароль</a>
            <Link to="/faq" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <h1>Профиль марафона временно недоступен</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/faq" className="btn-profile-login">Связаться с поддержкой</Link>
          </div>
        </section>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container">
        <p>Марафон не найден.</p>
        <Link to="/profile">← Мои марафоны</Link>
      </div>
    );
  }

  const current = data.current_step;
  const isFinished = Boolean(data.finished_at);
  const completedCount = data.answers.filter((answer) => answer.state === 'done' || answer.state === 'completed' || answer.state === 'checked').length;
  const progressPct = data.answers.length ? Math.round((completedCount / data.answers.length) * 100) : 0;
  const showBonusDays = data.bonus_total > 0;
  const medal = data.medal ? MEDAL_LABELS[data.medal] : null;
  const participantName = resolveParticipantName(profile);
  const finishedDate = data.finished_at ? formatDate(data.finished_at) : '';
  const awardCopy = resolveAwardLanguageCopy(data.languageCode);
  const certificateId = `speakasap-${data.languageCode}-${data.id.slice(0, 8)}`;
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
  const shareText = `Я завершил(а) языковой марафон SpeakASAP: ${stripHeadingTerminalPeriod(data.title)}. ${medal?.prize || 'Мой сертификат готов'}! ${awardCopy.hashtag}`;
  const shareLinks = makeShareLinks(shareText, shareUrl);
  const paymentProcessing = paymentReturn === 'success' && data.payment_required;
  const paymentReturnTitle = paymentReturn === 'success'
    ? (paymentProcessing ? 'Платеж обрабатывается' : 'Оплата подтверждена')
    : 'Оплата отменена';
  const paymentReturnBody = paymentReturn === 'success'
    ? (paymentProcessing
      ? 'Мы проверяем подтверждение оплаты автоматически. Когда провайдер подтвердит платеж, задания откроются на этой странице.'
      : 'Оплата подтверждена, задания доступны из этого профиля.')
    : 'Списание не выполнено. Вы можете снова открыть оплату или обратиться в поддержку с этой страницы.';

  const startCheckout = async () => {
    if (!data) return;
    const selectedMethod = PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod);
    if (selectedMethod?.disabled) {
      setCheckoutError('Банковский перевод временно недоступен. Используйте PayPal или оплату банковской картой.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const redirectUrl = await createPaymentCheckout(data.id, paymentMethod);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError('Оплата создана, но корректная ссылка для перехода не вернулась.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}#payment-access`);
        return;
      }
      setCheckoutError(error instanceof Error ? error.message : 'Не удалось открыть оплату');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const submitNps = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || npsScore === null) {
      setNpsError('Выберите оценку от 0 до 10.');
      return;
    }
    setNpsSaving(true);
    setNpsError('');
    setNpsMessage('');
    try {
      const body = await saveNpsSurvey(data.id, npsScore, npsComment);
      setData({ ...data, nps_survey: body });
      setNpsMessage('Спасибо. Ваш отзыв о марафоне сохранен.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      setNpsError(error instanceof Error ? error.message : 'Не удалось сохранить отзыв');
    } finally {
      setNpsSaving(false);
    }
  };

  const downloadCertificatePdf = () => {
    document.body.classList.add('profile-certificate-printing');
    window.print();
    window.setTimeout(() => document.body.classList.remove('profile-certificate-printing'), 400);
  };

  const shareCertificate = async () => {
    setShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Мой сертификат SpeakASAP', text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
      setShareMessage('Ссылка скопирована.');
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        setShareMessage('Скопируйте ссылку из адресной строки, чтобы поделиться.');
      }
    }
  };

  return (
    <div className="container page-static profile-dashboard">
      {!isFinished && (
        <section className="profile-hero-panel">
          <div>
            <h1>{stripHeadingTerminalPeriod(data.title)}</h1>
            {showBonusDays && (
              <p className="profile-meta">
                {`Бонусных дней: ${data.bonus_left} из ${data.bonus_total}.`}
              </p>
            )}
          </div>
          <div className="profile-progress-card">
            <span>Прогресс</span>
            <strong>{progressPct}%</strong>
            <div className="profile-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
          </div>
        </section>
      )}
      {isFinished && (
        <section className={`profile-finalist-panel profile-finalist-panel--${data.medal || 'complete'}`}>
          <div className="profile-finalist-copy">
            <p className="profile-completion-kicker">Марафон завершен</p>
            <h1>{medal?.title || 'Финалист марафона'}</h1>
            <p>{medal?.detail || `Финиш зафиксирован ${data.finished_at ? formatDateTime(data.finished_at) : ''}.`}</p>
            <div className="profile-finalist-prizes" aria-label="Призы финалиста">
              <a href="#profile-certificate" className="profile-finalist-prize">Диплом финалиста</a>
              {medal && <span className="profile-finalist-prize">{medal.prize}</span>}
              <a href={BOOK_PRIZE_URL} className="profile-finalist-prize" target="_blank" rel="noreferrer">PDF-книга</a>
              <Link to="/faq" className="profile-finalist-prize">{awardCopy.nextStep}</Link>
            </div>
          </div>
          <div className="profile-finalist-award">
            {medal && (
              <span className={`medal-badge medal-badge--${data.medal}`}>
                <span className="medal-badge__medal" aria-hidden="true">
                  <span className="medal-badge__ribbon" />
                  <span className="medal-badge__coin">1</span>
                </span>
                <span className="medal-badge__label">{medal.prize}</span>
              </span>
            )}
            <div className="profile-trophy" aria-hidden="true">
              <span className="profile-trophy-cup" />
              <span className="profile-trophy-base" />
            </div>
          </div>
          <div id="profile-certificate" className="profile-finalist-certificate" aria-label="Именной диплом SpeakASAP">
            <div className="profile-certificate-sheet">
              <span className="profile-certificate-mark">SpeakASAP</span>
              <h2>Сертификат SpeakASAP</h2>
              <p className="profile-certificate-subtitle">подтверждает участие в языковом марафоне SpeakASAP</p>
              <strong>{participantName}</strong>
              <p>{stripHeadingTerminalPeriod(data.title)}</p>
              <small>Финиш: {finishedDate}</small>
              <span className="profile-certificate-id">{certificateId}</span>
            </div>
            <div className="profile-certificate-actions">
              <button type="button" className="btn-profile-open" onClick={downloadCertificatePdf}>Скачать PDF</button>
              <button type="button" className="btn-profile-login" onClick={shareCertificate}>Поделиться</button>
              <a href={shareLinks.telegram} className="profile-share-link" target="_blank" rel="noreferrer">Telegram</a>
              <a href={shareLinks.whatsapp} className="profile-share-link" target="_blank" rel="noreferrer">WhatsApp</a>
              <a href={shareLinks.facebook} className="profile-share-link" target="_blank" rel="noreferrer">Facebook</a>
            </div>
            {shareMessage && <p className="profile-share-message">{shareMessage}</p>}
          </div>
        </section>
      )}
      {paymentReturn && (
        <section className={`profile-payment-return profile-payment-return-${paymentReturn}`}>
          <div className="profile-payment-return-copy">
            {paymentProcessing && <span className="profile-payment-spinner" aria-hidden="true" />}
            <div>
              <h2>{paymentReturnTitle}</h2>
              <p>{paymentReturnBody}</p>
              {paymentStatusError && <p className="ml-error">{paymentStatusError}</p>}
            </div>
          </div>
        </section>
      )}
      {data.payment_required && !paymentProcessing && (
        <section className="profile-payment-panel" id="payment-access">
          <div>
            <h2>Нужна оплата марафона</h2>
            <p>Оплатите марафон, чтобы открыть задания и продолжить прохождение.</p>
            {checkoutError && <p className="ml-error">{checkoutError}</p>}
          </div>
          <div className="profile-payment-methods" role="radiogroup" aria-label="Способ оплаты">
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={[
                  'profile-payment-method',
                  paymentMethod === option.value ? 'selected' : '',
                  option.disabled ? 'disabled' : '',
                ].filter(Boolean).join(' ')}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => {
                    if (!option.disabled) setPaymentMethod(option.value);
                  }}
                  disabled={checkoutLoading || option.disabled}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open profile-payment-cta" onClick={startCheckout} disabled={checkoutLoading || PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod)?.disabled}>
              {checkoutLoading ? 'Открываем оплату...' : 'Оплатить'}
            </button>
          </div>
        </section>
      )}
      {current && !data.finished_at && (
        <section className="profile-current">
          <h2>Текущий этап</h2>
          <p><strong>{current.title}</strong></p>
          <p>
            {getStepStatusText(current)}
          </p>
          <Link to={`/steps/${current.stepId}?marathonerId=${encodeURIComponent(data.id)}`} className="btn-profile-open">
            Открыть задание
          </Link>
        </section>
      )}
      {data.finished_at && !data.nps_survey && (
        <section className="profile-nps-panel">
          <div>
            <h2>Отзыв о марафоне</h2>
            <p>Ваша личная оценка помогает улучшать будущие задания и поддержку марафона.</p>
          </div>
          <form onSubmit={submitNps} className="profile-nps-form">
            <fieldset>
              <legend>Насколько вероятно, что вы порекомендуете этот марафон?</legend>
              <div className="profile-nps-scale">
                {Array.from({ length: 11 }, (_, score) => (
                  <label key={score} className={npsScore === score ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="nps-score"
                      value={score}
                      checked={npsScore === score}
                      onChange={() => setNpsScore(score)}
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="nps-comment">Что нам улучшить?</label>
            <textarea
              id="nps-comment"
              value={npsComment}
              onChange={(event) => setNpsComment(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Необязательная личная заметка для команды марафона"
            />
            <div className="profile-payment-actions">
              <button type="submit" className="btn-profile-open" disabled={npsSaving || npsScore === null}>
                {npsSaving ? 'Сохранение...' : 'Сохранить отзыв'}
              </button>
            </div>
            {npsMessage && <p className="step-submit-success">{npsMessage}</p>}
            {npsError && <p className="ml-error">{npsError}</p>}
          </form>
        </section>
      )}
      <section className="profile-steps">
        <h2>{isFinished ? 'Пройденные темы' : 'Этапы'}</h2>
        <ul className="profile-answers">
          {data.answers.map((a) => {
            const paymentBlocked = a.block_reason === 'payment_required';
            const canOpen = Boolean(a.can_open) && !paymentBlocked;
            return (
              <li key={String(a.id)} className={`answer-state-${a.state}${paymentBlocked ? ' answer-state-payment-required' : ''}`}>
                <div className="profile-step-main">
                  <div className="profile-step-heading">
                    <span className="answer-title">{a.title}</span>
                    {!paymentBlocked && <span className="answer-state">{getStateLabel(a)}</span>}
                  </div>
                  <span className="profile-step-meta">{getStepStatusText(a)}</span>
                </div>
                {canOpen && (
                  <Link className="profile-step-action" to={`/steps/${a.stepId}?marathonerId=${encodeURIComponent(data.id)}`}>
                    {a.state === 'inactive' ? 'Открыть заранее' : 'Открыть'}
                  </Link>
                )}
                {!canOpen && !paymentBlocked && (
                  <span className="profile-step-action profile-step-action-disabled">Закрыто</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
