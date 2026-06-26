import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AdminMarathonPricingError,
  AdminMarathonPricesResponse,
  AdminTestPaymentParticipant,
  AdminTestPaymentResponse,
  fetchAdminMarathonPrices,
  fetchAdminTestPaymentParticipants,
  updateAdminTestPayment,
  updateAllAdminMarathonPrices,
} from '../api/adminMarathon';
import { getLoginUrl } from '../auth';

type StatusState = {
  kind: 'idle' | 'success' | 'error';
  message: string;
};

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

function normalizePrice(value: string): string {
  return value.trim().replace(',', '.');
}

function statusForError(error: unknown): StatusState {
  if (error instanceof AdminMarathonPricingError) {
    if (error.status === 401) {
      return { kind: 'error', message: 'Войдите в аккаунт администратора, чтобы менять цены.' };
    }
    if (error.status === 403) {
      return { kind: 'error', message: 'Ваш аккаунт не добавлен в список администраторов Marathon.' };
    }
    return { kind: 'error', message: error.message };
  }
  return { kind: 'error', message: 'Не удалось загрузить админку.' };
}

export default function AdminMarathonPrices() {
  const [catalog, setCatalog] = useState<AdminMarathonPricesResponse | null>(null);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusState>({ kind: 'idle', message: '' });
  const [testPayments, setTestPayments] = useState<AdminTestPaymentResponse | null>(null);
  const [paymentSavingId, setPaymentSavingId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<StatusState>({ kind: 'idle', message: '' });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdminMarathonPrices()
      .then((result) => {
        if (!alive) return;
        setCatalog(result);
        const first = result.items[0];
        if (first) {
          setPrice(first.price);
          setCurrency(first.currency);
        }
        setStatus({ kind: 'idle', message: '' });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setTestPayments(null);
        setStatus(statusForError(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    fetchAdminTestPaymentParticipants()
      .then((paymentResult) => {
        if (!alive) return;
        setTestPayments(paymentResult);
        setPaymentStatus({ kind: 'idle', message: '' });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        if (error instanceof AdminMarathonPricingError && (error.status === 401 || error.status === 403)) {
          setTestPayments(null);
          return;
        }
        setPaymentStatus(statusForError(error));
      });

    return () => {
      alive = false;
    };
  }, []);

  const currentPriceLabel = useMemo(() => {
    if (!catalog?.items.length) return 'нет данных';
    const prices = new Set(catalog.items.map((item) => `${item.price} ${item.currency}`));
    return prices.size === 1 ? catalog.items[0].price + ' ' + catalog.items[0].currency : 'цены различаются';
  }, [catalog]);

  const canSave = Boolean(catalog?.items.length) && !loading && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog) return;

    const nextPrice = normalizePrice(price);
    const nextCurrency = currency.trim().toUpperCase();
    if (!PRICE_PATTERN.test(nextPrice) || Number(nextPrice) <= 0) {
      setStatus({ kind: 'error', message: 'Укажите положительную цену с максимум двумя знаками после точки.' });
      return;
    }
    if (!/^[A-Z]{3}$/.test(nextCurrency)) {
      setStatus({ kind: 'error', message: 'Валюта должна быть трехбуквенным ISO-кодом, например EUR.' });
      return;
    }

    setSaving(true);
    setStatus({ kind: 'idle', message: '' });
    try {
      const updated = await updateAllAdminMarathonPrices({
        price: nextPrice,
        currency: nextCurrency,
        expectedActiveCount: catalog.activeCount,
      });
      setCatalog(updated);
      setPrice(nextPrice);
      setCurrency(nextCurrency);
      setStatus({
        kind: 'success',
        message: `Цена обновлена для ${updated.productCount} активных марафонов.`,
      });
    } catch (error) {
      setStatus(statusForError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPaymentToggle(participant: AdminTestPaymentParticipant) {
    const nextPaid = !participant.paid;
    setPaymentSavingId(participant.id);
    setPaymentStatus({ kind: 'idle', message: '' });
    try {
      const updated = await updateAdminTestPayment({
        participantId: participant.id,
        paid: nextPaid,
        expectedPaid: participant.paid,
      });
      setTestPayments(updated);
      setPaymentStatus({
        kind: 'success',
        message: nextPaid
          ? 'Тестовая оплата отмечена. Доступ к заданиям открыт.'
          : 'Тестовая оплата снята. Доступ снова требует оплаты.',
      });
    } catch (error) {
      setPaymentStatus(statusForError(error));
    } finally {
      setPaymentSavingId(null);
    }
  }

  return (
    <main className="admin-pricing-page">
      <div className="container">
        <header className="admin-pricing-header">
          <p className="admin-pricing-kicker">Админка Marathon</p>
          <h1>Цены марафонов</h1>
          <p>
            Массовое изменение цены применяется ко всем активным марафонам. Новая сумма используется
            только для новых checkout; уже созданные платежные попытки сохраняют свою сумму.
          </p>
        </header>

        <section className="admin-pricing-panel" aria-label="Изменение цены марафонов">
          <form className="admin-pricing-toolbar" onSubmit={handleSubmit}>
            <div className="admin-pricing-field">
              <label htmlFor="admin-price">Новая цена</label>
              <input
                id="admin-price"
                inputMode="decimal"
                name="price"
                onChange={(event) => setPrice(event.target.value)}
                placeholder="39.00"
                value={price}
              />
            </div>
            <div className="admin-pricing-field">
              <label htmlFor="admin-currency">Валюта</label>
              <input
                id="admin-currency"
                maxLength={3}
                name="currency"
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                placeholder="EUR"
                value={currency}
              />
            </div>
            <button className="admin-pricing-save" disabled={!canSave} type="submit">
              {saving ? 'Сохраняем...' : 'Сменить цену'}
            </button>
          </form>

          {loading ? <p className="admin-pricing-status">Загружаем текущие цены...</p> : null}
          {!loading && status.message ? (
            <p className={`admin-pricing-status ${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
              {status.message}
              {status.kind === 'error' && status.message.includes('Войдите') ? (
                <> <a href={getLoginUrl('/admin/marathons/prices')}>Войти</a></>
              ) : null}
            </p>
          ) : null}
          {!loading && catalog ? (
            <p className="admin-pricing-status">
              Активных марафонов: {catalog.activeCount}. Продуктов: {catalog.productCount}. Текущая цена: {currentPriceLabel}.
            </p>
          ) : null}

          <div className="admin-pricing-table-wrap">
            <table className="admin-pricing-table">
              <thead>
                <tr>
                  <th>Язык</th>
                  <th>Slug</th>
                  <th>Продукт</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {(catalog?.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td><span className="admin-pricing-muted">{item.slug}</span></td>
                    <td>{item.productTitle}</td>
                    <td>{item.price} {item.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(testPayments || paymentStatus.message) && <section className="admin-pricing-panel" aria-label="Тестовая оплата">
          <header className="admin-pricing-header">
            <p className="admin-pricing-kicker">Тестирование доступа</p>
            <h2>Оплата для test@example.com</h2>
            <p>
              Переключатель меняет только флаг доступа участника с email {testPayments?.testEmail || 'test@example.com'}.
              Платежная попытка, возврат или внешний платеж не создаются.
            </p>
          </header>

          {paymentStatus.message ? (
            <p
              className={`admin-pricing-status ${paymentStatus.kind}`}
              role={paymentStatus.kind === 'error' ? 'alert' : 'status'}
            >
              {paymentStatus.message}
            </p>
          ) : null}

          <div className="admin-pricing-table-wrap">
            <table className="admin-pricing-table">
              <thead>
                <tr>
                  <th>Марафон</th>
                  <th>Email</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {(testPayments?.participants || []).map((participant) => (
                  <tr key={participant.id}>
                    <td>
                      {participant.marathon.title}
                      <br />
                      <span className="admin-pricing-muted">{participant.marathon.slug}</span>
                    </td>
                    <td>{participant.email || testPayments?.testEmail}</td>
                    <td>
                      {participant.paid ? 'Оплачено' : 'Требуется оплата'}
                      {!participant.active ? (
                        <>
                          <br />
                          <span className="admin-pricing-muted">неактивен</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <button
                        className="admin-pricing-save"
                        disabled={Boolean(paymentSavingId) || !participant.active}
                        onClick={() => handleTestPaymentToggle(participant)}
                        type="button"
                      >
                        {paymentSavingId === participant.id
                          ? 'Сохраняем...'
                          : participant.paid ? 'Снять оплату' : 'Отметить оплату'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && testPayments && testPayments.participants.length === 0 ? (
            <p className="admin-pricing-status">Участник test@example.com не найден.</p>
          ) : null}
        </section>}
      </div>
    </main>
  );
}
