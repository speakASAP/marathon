import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CertificateShowcase from '../components/CertificateShowcase';

const ABOUT_IMAGES = {
  hero: '/img/marathon/runners-start-finish.png',
  dailyTask: '/img/marathon/runners-daily-task.png',
  route: '/img/marathon/marathon-route-runner-20260624.png',
  finish: '/img/marathon/runners-finish-day30.png',
};

const benefitBlocks = [
  {
    title: 'Каждый день понятно, что делать',
    text: 'Один этап, одно задание, один конкретный шаг вперед.',
    image: ABOUT_IMAGES.dailyTask,
    alt: 'Участник выполняет ежедневное задание языкового марафона',
  },
  {
    title: 'Не просто уроки, а ритм',
    text: 'Марафон держит темп и помогает не откладывать язык на завтра.',
    image: ABOUT_IMAGES.route,
    alt: 'Маршрут языкового марафона на 30 дней',
  },
  {
    title: 'Финиш с видимым результатом',
    text: 'Через 30 дней у вас есть база, практика и понятный следующий шаг.',
    image: ABOUT_IMAGES.finish,
    alt: 'Финиш языкового марафона SpeakASAP',
  },
];

const routeSteps = [
  ['Старт', 'Вы выбираете язык и входите в маршрут.'],
  ['Практика', 'Каждый день выполняете задание и отправляете отчет.'],
  ['Финиш', 'Закрываете 30 дней и переходите к разговорной практике.'],
];

/**
 * Static page: О языковых марафонах.
 */
export default function About() {
  const location = useLocation();

  useEffect(() => {
    document.title = 'О марафоне — языковые марафоны SpeakASAP®';
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.slice(1);
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });
  }, [location.hash]);

  return (
    <main className="about-landing">
      <section className="about-hero">
        <div className="about-hero__copy">
          <h1>
            <span>30 дней, чтобы</span>{" "}
            <span>заговорить</span>
          </h1>
          <p>
            Языковой марафон SpeakASAP — это короткий маршрут от старта до финиша:
            каждый день вы делаете одно понятное задание и видите, как двигаетесь вперед.
          </p>
          <div className="about-hero__actions">
            <Link to="/de/" className="about-button about-button--primary">
              Посмотреть марафон
            </Link>
            <Link to="/rules" className="about-button about-button--secondary">
              Как это работает
            </Link>
          </div>
        </div>
        <div className="about-hero__media" aria-label="Маршрут языкового марафона от старта к финишу">
          <img src={ABOUT_IMAGES.hero} alt="Участники стартуют в языковом марафоне SpeakASAP" />
          <div className="about-hero-card">
            <strong>30 дней</strong>
            <span>старт, ежедневная практика, финиш</span>
          </div>
        </div>
      </section>

      <section className="about-strip" aria-label="Главные результаты марафона">
        <div>
          <strong>А1</strong>
          <span>примерный уровень после финиша</span>
        </div>
        <div>
          <strong>1</strong>
          <span>понятное задание каждый день</span>
        </div>
        <div>
          <strong>2 часа</strong>
          <span>рекомендованное время занятий</span>
        </div>
      </section>

      <section className="about-benefits" aria-labelledby="about-benefits-title">
        <div className="about-section-heading">
          <h2 id="about-benefits-title">Марафон помогает не читать о языке, а пользоваться им</h2>
          <p>Мы оставили только самое важное: базу, практику и ежедневное движение.</p>
        </div>
        <div className="about-benefit-grid">
          {benefitBlocks.map((block) => (
            <article className="about-benefit" key={block.title}>
              <img src={block.image} alt={block.alt} />
              <div>
                <h3>{block.title}</h3>
                <p>{block.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-route" aria-labelledby="about-route-title">
        <div className="about-route__visual">
          <img src={ABOUT_IMAGES.route} alt="Визуальная карта прохождения языкового марафона" />
        </div>
        <div className="about-route__copy">
          <h2 id="about-route-title">Как выглядит путь</h2>
          <div className="about-route-steps">
            {routeSteps.map(([title, text], index) => (
              <div className="about-route-step" key={title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-awards" id="awards" aria-labelledby="about-awards-title">
        <div className="about-section-heading about-awards__heading">
          <h2 id="about-awards-title">Награды и сертификаты финалиста</h2>
          <p>
            По завершении марафона финалисты получают сертификат SpeakASAP. Вид сертификата
            зависит от результата прохождения: золотой, серебряный или бронзовый.
          </p>
        </div>
        <CertificateShowcase
          id="about-awards-certificate"
          className="about-awards__showcase"
          title="Примеры сертификатов финалиста"
          lead="Финалист видит статус «Сертификат» и получает одну из трех медальных версий."
          compact
          showStatus={false}
        />
      </section>

      <section className="about-final">
        <div>
          <h2>Язык — это не цель. Это инструмент для жизни.</h2>
          <p>
            Марафон подойдет тем, кто начинает с нуля или давно учит язык нерегулярно
            и хочет наконец перейти к понятной ежедневной практике.
          </p>
        </div>
        <Link to="/de/" className="about-button about-button--primary">
          На старт
        </Link>
      </section>
    </main>
  );
}
