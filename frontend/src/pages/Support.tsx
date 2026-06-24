import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCatalogReadiness, sendSupportChatMessage, type CatalogReadiness } from '../api/publicMarathon';

const SUPPORT_EMAIL = 'marathon@speakasap.com';

type ChatMessage = {
  role: 'agent' | 'user';
  text: string;
};

function formatMissingLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCount(value: number | undefined): string {
  if (typeof value !== 'number') return '0';
  return new Intl.NumberFormat('ru-RU').format(value);
}

export default function Support() {
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: 'Здравствуйте. Я отвечаю только на вопросы о марафонах SpeakASAP: регистрация, профиль, задания, VIP, подарочные коды и победители.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  useEffect(() => {
    document.title = 'Поддержка — Марафон';
    setLoading(true);
    setError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setError('Статус регистрации временно недоступен. Перед стартом марафона обратитесь в поддержку.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput('');
    setChatError('');
    setChatLoading(true);
    setChatMessages((items) => [...items, { role: 'user', text: message }]);
    try {
      const response = await sendSupportChatMessage(message);
      setChatMessages((items) => [...items, { role: 'agent', text: response.answer }]);
    } catch {
      setChatError('Чат временно недоступен. Напишите в поддержку, если вопрос срочный.');
      setChatMessages((items) => [
        ...items,
        {
          role: 'agent',
          text: 'Сейчас не получается получить ответ чат-агента. По вопросам марафона можно написать в поддержку и указать email регистрации, язык и страницу.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const registrationOpen = readiness?.registrationOpen === true;
  const missing = readiness?.missing ?? [];

  return (
    <div className="container page-static page-support">

      <section className="support-public-hero">
        <div>
          <h1>Поддержка марафона</h1>
          <p>
            Помощь с регистрацией, доступом к профилю и прохождением языкового марафона.
          </p>
        </div>
        <a className="btn-profile-login" href={`mailto:${SUPPORT_EMAIL}`}>
          Связаться с поддержкой
        </a>
      </section>

      <section className="support-chat-panel" aria-label="Онлайн-чат по марафону">
        <div className="support-chat-heading">
          <div>
            <span>Онлайн-чат</span>
            <h2>Спросите чат-агента о марафоне</h2>
          </div>
          <strong>Только Marathon</strong>
        </div>
        <div className="support-chat-messages" aria-live="polite">
          {chatMessages.map((item, index) => (
            <div className={`support-chat-message support-chat-message-${item.role}`} key={`${item.role}-${index}`}>
              {item.text}
            </div>
          ))}
          {chatLoading && <div className="support-chat-message support-chat-message-agent">Проверяю данные марафона...</div>}
        </div>
        <form className="support-chat-form" onSubmit={handleChatSubmit}>
          <label htmlFor="support-chat-input">Ваш вопрос о марафоне</label>
          <div>
            <input
              id="support-chat-input"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              maxLength={1200}
              placeholder="Например: как продолжить марафон или где открыть профиль?"
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}>
              Отправить
            </button>
          </div>
          {chatError && <p className="ml-error">{chatError}</p>}
          <p>Чат отвечает только по марафонам и не обрабатывает вопросы вне этой темы.</p>
        </form>
      </section>

      <section className="support-public-status" aria-live="polite">
        <div className="support-public-status-heading">
          <span>Статус регистрации</span>
          <strong className={registrationOpen ? 'support-status-badge support-status-badge-open' : 'support-status-badge'}>
            {loading ? 'Проверяем' : registrationOpen ? 'Регистрация открыта' : 'Пока закрыта'}
          </strong>
        </div>
        {error ? (
          <p className="ml-error">{error}</p>
        ) : registrationOpen ? (
          <p>Регистрация открыта. Выберите язык и начните марафон со страницы регистрации.</p>
        ) : (
          <p>
            Регистрация откроется после готовности утвержденного каталога марафонов.
          </p>
        )}
        {!loading && readiness && (
          <dl className="support-public-counts">
            <div><dt>Участники марафона</dt><dd>{formatCount(readiness.counts.registeredParticipants)}</dd></div>
            <div><dt>Активные марафоны</dt><dd>{formatCount(readiness.counts.activeMarathons)}</dd></div>
            <div><dt>Иностранные языки</dt><dd>{formatCount(readiness.counts.activeLanguages ?? readiness.counts.activeMarathons)}</dd></div>
          </dl>
        )}
        {!loading && missing.length > 0 && (
          <div className="support-public-missing" aria-label="Блокеры регистрации">
            {missing.map((item) => (
              <span key={item}>{formatMissingLabel(item)}</span>
            ))}
          </div>
        )}
        <div className="support-public-actions">
          <Link to="/register" className="btn-profile-login">
            {registrationOpen ? 'Начать марафон' : 'Посмотреть статус регистрации'}
          </Link>
          <Link to="/profile" className="btn-profile-open">Открыть профиль</Link>
        </div>
      </section>

      <section className="support-public-grid">
        <article>
          <span>Профиль и вход</span>
          <h2>Не видите свой марафон?</h2>
          <p>
            Войдите через SpeakASAP со страницы профиля. Если вы уже зарегистрированы, мы автоматически перенаправим вас в нужный профиль марафона.
          </p>
          <Link to="/profile">Открыть профиль</Link>
        </article>
        <article>
          <span>Языки</span>
          <h2>13 иностранных языков</h2>
          <p>
            Выберите свой языковой марафон и продолжайте обучение в профиле участника.
          </p>
          <Link to="/register">Выбрать язык</Link>
        </article>
        <article>
          <span>Марафон</span>
          <h2>Продолжить участие</h2>
          <p>
            Выполните задание и отправьте отчет, чтобы завершить этап. После каждого этапа система проверяет выполнение, и вы можете бежать марафон дальше.
          </p>
          <Link to="/profile">Продолжить марафон</Link>
        </article>
      </section>

      <section className="support-public-contact">
        <h2>Что указать</h2>
        <ul>
          <li>Ваш email регистрации.</li>
          <li>Языковой марафон, который вы пытаетесь открыть.</li>
          <li>Краткое описание страницы или действия, с которым нужна помощь.</li>
        </ul>
        <a className="btn-profile-login" href={`mailto:${SUPPORT_EMAIL}`}>
          Связаться с поддержкой
        </a>
      </section>
    </div>
  );
}
