/**
 * Marketing opt-in control.
 *
 * The checkbox never shows a state the server did not accept: every change is
 * written first and the UI is reconciled from the response, so a failed request
 * leaves the user looking at the truth rather than at their intent.
 */

import { useCallback, useEffect, useState } from 'react';
import { getAuthBaseUrl, getLoginUrl, getToken } from '../auth';
import { MARKETING_CONSENT_VERSION } from '../lib/consentVersion';

const PRODUCT = 'marathon';

type ConsentState = {
  granted: boolean;
  version: string | null;
};

export default function MarketingConsent() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailure, setLoadFailure] = useState<'signed_out' | 'failed' | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = getToken();
    if (!token) {
      throw new Error('not_signed_in');
    }
    const response = await fetch(`${getAuthBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`request_failed_${response.status}`);
    }
    return response;
  }, []);

  const load = useCallback(async () => {
    const response = await request('/auth/marketing-consents');
    const body = await response.json();
    setState({
      granted: Boolean(body?.consents?.[PRODUCT]),
      version: body?.versions?.[PRODUCT] ?? null,
    });
  }, [request]);

  useEffect(() => {
    load().catch((cause) =>
      setLoadFailure(
        cause instanceof Error && cause.message === 'not_signed_in' ? 'signed_out' : 'failed',
      ),
    );
  }, [load]);

  const grant = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await request('/auth/marketing-consents', {
        method: 'POST',
        body: JSON.stringify({
          product: PRODUCT,
          documentVersion: MARKETING_CONSENT_VERSION,
        }),
      });
      await load();
    } catch {
      setError('Не удалось сохранить. Ваша настройка осталась прежней.');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [request, load]);

  const revoke = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await request(`/auth/marketing-consents/${PRODUCT}`, { method: 'DELETE' });
      await load();
    } catch {
      setError('Не удалось сохранить. Ваша настройка осталась прежней.');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [request, load]);

  // A failed load must say so. Falling through to the "loading" branch would
  // leave a signed-out visitor staring at a spinner that never resolves.
  if (loadFailure === 'signed_out') {
    return (
      <p>
        Чтобы управлять рассылками, <a href={getLoginUrl('/account/marketing-consent')}>войдите в
        аккаунт</a>. Отписаться можно и без входа — по ссылке из любого нашего маркетингового
        письма.
      </p>
    );
  }

  if (loadFailure === 'failed') {
    return (
      <p role="alert">
        Не удалось загрузить настройки рассылок. Обновите страницу или воспользуйтесь ссылкой для
        отписки из любого нашего маркетингового письма.
      </p>
    );
  }

  if (!state) {
    return <p>Загружаем настройки рассылок…</p>;
  }

  // Consent given under older wording stays valid, so the box stays ticked —
  // but we ask again rather than quietly relying on the earlier text.
  const needsReconfirm = state.granted && state.version !== MARKETING_CONSENT_VERSION;

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={state.granted}
          disabled={busy}
          onChange={(event) => (event.target.checked ? grant() : revoke())}
        />{' '}
        Присылайте мне письма о новых программах марафона и предложениях. Отозвать согласие можно в
        любой момент.
      </label>

      {needsReconfirm ? (
        <p>
          Формулировки о рассылках изменились с момента вашего согласия. Пожалуйста, подтвердите,
          что вы по-прежнему хотите получать эти письма.{' '}
          <button type="button" onClick={grant} disabled={busy}>
            Подтвердить
          </button>
        </p>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}

      <p>
        Маркетинговые письма мы отправляем только с вашего согласия, и в каждом письме есть ссылка
        на отписку. Подробнее — в <a href="/privacy">политике конфиденциальности</a>.
      </p>
    </section>
  );
}
