import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { sendSupportChatMessage } from '../api/publicMarathon';

const SUPPORT_EMAIL = 'marathon@speakasap.com';

type ChatMessage = {
  role: 'agent' | 'user';
  text: string;
};

/**
 * Static page: Помощь (FAQ). Content from legacy faq.html (help for participants).
 */
export default function Faq() {
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
    document.title = 'Помощь по марафону — языковые марафоны SpeakASAP®';
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
      <h1>Помощь</h1>
      <div className="static-content faq-content">
        <section>
          <h2>Как понять, что этап пройден?</h2>
          <p>После формирования отчёта в меню напротив этапа появляется ✅ зелёная «птичка». Это означает, что отчёт сохранён в системе. После того как система проверит отчёт (в то время, которое вы указали как «Время публикации отчёта»), напротив этапа появится вторая «птичка».</p>
        </section>
        <section>
          <h2>При смене времени публикации отчёта добавился один день</h2>
          <p>Если вы, например, в 22:00 измените ⏰ время публикации отчёта на 20:00, то система добавит вам один день ⏳, и отчёт надо будет опубликовать до 20:00 <strong>следующего</strong> дня.</p>
        </section>
        <section>
          <h2>Что такое «Время публикации отчёта»?</h2>
          <p>⏰ Время публикации отчёта — это то время, до которого вам надо выполнить очередной этап и опубликовать ваш отчёт.</p>
        </section>
        <section>
          <h2>Отправил(а) первый отчёт, когда получу второе задание?</h2>
          <p>В то ⏰ время, которое вы указали в настройках марафона. Можно дождаться времени открытия следующего этапа либо открыть его вручную. В таком случае есть возможность пройти марафон значительно быстрее 30 дней.</p>
        </section>
        <section>
          <h2>Появляется надпись «Вы не опубликовали отчёт вовремя»</h2>
          <p>Это предупреждение означает, что вы не опубликовали вовремя один из подготовительных этапов. В основных этапах вам нужно будет либо пройти штрафной круг 🏃‍♂️, либо система снимет с вас один бонусный день. Отчёт должен быть опубликован до того времени, которое вы указали. Выберите удобное для вас время, до которого отчёт должен быть опубликован.</p>
        </section>
        <section id="special-characters">
          <h2>Как печатать специальные символы в разных языках?</h2>
          <p>В немецком, французском, испанском, чешском и других языках могут быть буквы и знаки, которых нет в русской или английской раскладке: ä, ö, ü, ß, é, è, ê, ç, ñ, č и другие.</p>
          <p>Проще всего добавить на своем устройстве раскладку нужного языка. Это можно сделать на телефоне, планшете, ноутбуке или компьютере: откройте настройки клавиатуры или языка, добавьте нужный язык и переключайтесь на него, когда выполняете задания.</p>
          <p>Если добавлять раскладку неудобно, можно пользоваться экранной клавиатурой или вводить символы сочетаниями клавиш. Например, для немецких букв можно использовать немецкую раскладку или английскую раскладку США — международную: правый Alt + s = ß, правый Alt + q = ä, правый Alt + y = ü, правый Alt + p = ö. Для французских символов в английской раскладке можно использовать: é — Ctrl + апостроф + e; è — Ctrl + ` + e; ê — Ctrl + Shift + 6 + e; ç — Ctrl + запятая + c.</p>
        </section>
      </div>

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
    </div>
  );
}
