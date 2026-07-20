/**
 * Public unsubscribe landing page.
 *
 * Deliberately requires no sign-in: GDPR requires withdrawal to be as easy as
 * giving consent, and demanding a login from an e-mail link fails that test.
 */

import { useEffect, useState } from 'react';
import { getAuthBaseUrl } from '../auth';

type Status = 'working' | 'done' | 'invalid' | 'error';

export default function Unsubscribe() {
  const [status, setStatus] = useState<Status>('working');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('invalid');
      return;
    }

    fetch(`${getAuthBaseUrl()}/auth/marketing-consents/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (response.ok) {
          setStatus('done');
        } else if (response.status === 400) {
          setStatus('invalid');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'working') {
    return (
      <main>
        <h1>Отписываем…</h1>
      </main>
    );
  }

  if (status === 'done') {
    return (
      <main>
        <h1>Вы отписаны</h1>
        <p>
          Мы больше не будем присылать вам маркетинговые письма о программах марафона. Служебные
          письма о том, на что вы уже записаны, — например, о текущем марафоне — продолжат приходить.
        </p>
        <p>
          Передумали? Включить рассылку снова можно в{' '}
          <a href="/account/marketing-consent">настройках рассылок</a>.
        </p>
      </main>
    );
  }

  // An expired or malformed link must still lead somewhere useful, not a dead end.
  return (
    <main>
      <h1>Ссылка для отписки не сработала</h1>
      <p>
        {status === 'invalid'
          ? 'Ссылка недействительна или истёк её срок.'
          : 'Что-то пошло не так на нашей стороне.'}
      </p>
      <p>
        Отключить маркетинговые письма можно в{' '}
        <a href="/account/marketing-consent">настройках рассылок</a> после входа в аккаунт.
      </p>
    </main>
  );
}
