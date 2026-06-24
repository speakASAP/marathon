import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendSupportChatMessage } from "../api/publicMarathon";

const SUPPORT_EMAIL = 'marathon@speakasap.com';

type ChatMessage = {
  role: 'agent' | 'user';
  text: string;
};


export default function Support() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: 'Здравствуйте. Я отвечаю только на вопросы о марафонах SpeakASAP: регистрация, профиль, оплата, задания, подарочные коды и победители.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = "Поддержка — Марафон";
  }, []);

  useEffect(() => {
    chatMessagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput('');
    setChatError('');
    setChatLoading(true);
    setChatMessages((items) => [{ role: 'user', text: message }, ...items]);
    try {
      const response = await sendSupportChatMessage(message);
      setChatMessages((items) => {
        const [latest, ...older] = items;
        if (latest?.role === 'user' && latest.text === message) {
          return [latest, { role: 'agent', text: response.answer }, ...older];
        }
        return [{ role: 'agent', text: response.answer }, ...items];
      });
    } catch {
      setChatError('Чат временно недоступен. Напишите в поддержку, если вопрос срочный.');
      setChatMessages((items) => {
        const [latest, ...older] = items;
        const fallbackMessage: ChatMessage = {
          role: 'agent',
          text: 'Сейчас не получается получить ответ чат-агента. По вопросам марафона можно написать в поддержку и указать email регистрации, язык и страницу.',
        };
        if (latest?.role === 'user' && latest.text === message) {
          return [latest, fallbackMessage, ...older];
        }
        return [fallbackMessage, ...items];
      });
    } finally {
      setChatLoading(false);
    }
  }


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
        <div className="support-chat-messages" aria-live="polite" ref={chatMessagesRef}>
          {chatMessages.map((item, index) => (
            <Fragment key={`${item.role}-${index}`}>
              <div className={`support-chat-message support-chat-message-${item.role}`}>
                {item.text}
              </div>
              {chatLoading && index === 0 && (
                <div className="support-chat-message support-chat-message-agent">Проверяю данные марафона...</div>
              )}
            </Fragment>
          ))}
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


      <section className="support-public-status" aria-label="Быстрые действия">
        <div className="support-public-status-heading">
          <span>Профиль и вход</span>
          <strong className="support-status-badge">Участнику</strong>
        </div>
        <p>
          Войдите в профиль, чтобы открыть свои марафоны, оплату, подарочный код, отчеты и обратную связь.
        </p>
        <div className="support-public-actions">
          <Link to="/profile" className="btn-profile-login">Продолжить участие</Link>
          <Link to="/register" className="btn-profile-open">Выбрать язык</Link>
        </div>
      </section>

    </div>
  );
}
