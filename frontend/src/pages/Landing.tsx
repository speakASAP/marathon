import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import CertificateShowcase from '../components/CertificateShowcase';
import {
  fetchCatalogReadiness,
  fetchMarathonByLanguage,
  fetchMarathonLanguages,
  fetchPublicReviews,
  type CatalogReadiness,
  type MarathonLanguage,
  type MarathonSummary,
  type PublicReview,
} from '../api/publicMarathon';
import { formatLanguageLabel } from '../languages';
import '../landing.css';


const MARATHON_IMAGES = {
  hero: '/img/marathon/runners-start-finish.webp',
  dailyTask: '/img/marathon/runners-daily-task.webp',
  finish: '/img/marathon/runners-finish-day30.webp',
  routeRunner: '/img/marathon/marathon-route-runner-20260624.webp',
};

function formatLanguageName(marathon: MarathonSummary): string {
  return formatLanguageLabel(marathon.languageCode, marathon.title);
}

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCount(value: number | undefined): string {
  if (typeof value !== 'number') return '0';
  return new Intl.NumberFormat('ru-RU').format(value);
}

export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const isLanguageLanding = Boolean(langSlug && langSlug !== 'landing');
  const effectiveLangSlug = isLanguageLanding && langSlug ? langSlug : 'de';
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      fetchMarathonByLanguage(effectiveLangSlug),
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
      fetchPublicReviews(),
    ])
      .then(([marathonData, langs, readinessData, reviewsData]) => {
        setMarathon(marathonData || {
          id: 'fallback',
          languageCode: effectiveLangSlug,
          title: '',
        });
        setLanguages(langs);
        setReadiness(readinessData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => {
        setMarathon(null);
        setLanguages([]);
        setReadiness(null);
        setReviews([]);
        setLoadError('Страница марафона не загрузилась. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
      })
      .finally(() => setLoading(false));
  }, [effectiveLangSlug]);

  useEffect(() => {
    if (!marathon) return;
    const langName = formatLanguageName(marathon);
    const metaReady = marathon.id !== 'fallback' && readiness?.registrationOpen === true;
    document.title = metaReady
      ? `${langName} марафон — языковая практика SpeakASAP`
      : `${langName} марафон — статус регистрации`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      metaReady
        ? `Присоединяйтесь к марафону ${langName} от SpeakASAP: утвержденные задания, оплату через профиль и отслеживание прогресса.`
        : `Регистрация на марафон ${langName} откроется после загрузки утвержденного каталога, заданий и платежного продукта.`,
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/${marathon.languageCode}/`);
  }, [marathon, readiness]);

  const featuredReviews = useMemo(() => reviews.slice(0, 3), [reviews]);

  useEffect(() => {
    if (loading || loadError || !marathon || window.location.hash !== "#register") return;
    const id = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [loading, loadError, marathon]);


  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRegisterSuccess = (marathonerId: string) => {
    setFormError('');
    setRegisteredId(marathonerId);
  };

  if (loading) {
    return (
      <div className="marathon-loading">
        <p>Загрузка марафона...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <h1>Страница марафона временно недоступна</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/faq" className="btn-profile-login">
              Связаться с поддержкой
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!marathon) {
    return (
      <div className="container page-static">
        <p>Данные марафона временно недоступны.</p>
        <Link to="/faq">Связаться с поддержкой</Link>
      </div>
    );
  }

  const raceLanguageName = formatLanguageName(marathon);
  const participantCount = isLanguageLanding
    ? marathon.participantCount
    : readiness?.counts.registeredParticipants;
  const participantLabel = isLanguageLanding ? 'участников в этом марафоне' : 'участников уже зарегистрированы';
  const resultLevel = marathon.languageCode.toLowerCase() === 'en' ? 'pre-intermediate' : 'A1';
  const hasActiveMarathon = marathon.id !== 'fallback';
  const registrationOpen = hasActiveMarathon && readiness?.registrationOpen === true;
  const registrationStatusId = registrationOpen ? undefined : 'registration-status-note';
  const heroCtaLabel = registrationOpen ? 'Начать 30-дневный марафон' : 'Посмотреть маршрут на 30 дней';
  const heroSecondary = registrationOpen
    ? { to: '/profile', label: 'Открыть мой марафон' }
    : { to: '/faq', label: 'Связаться с поддержкой' };
  const pricingIntro = `Марафон устроен как забег: начните со старта, каждый день выполняйте одно задание и придите к финишу с результатом уровня ${resultLevel}.`;
  const heroTitle = registrationOpen
    ? `Пройдите марафон ${raceLanguageName} за 30 дней`
    : `Марафон ${raceLanguageName} начинается с движения.`;
  const heroIntro = registrationOpen
    ? `Начните с первого дня, каждый день выполняйте одно языковое задание, следите за темпом в профиле и на финише получите результат уровня ${resultLevel}.`
    : `Наглядный 30-дневный маршрут от старта до финиша: каждый день вы проходите один этап, выполняете задание и движетесь к результату уровня ${resultLevel}.`;
  const registerTitle = registrationOpen ? `Старт марафона: ${raceLanguageName}` : 'Регистрация скоро откроется';
  const missingLaunchGates = readiness?.missing ?? [];
  const faqItems = registrationOpen
    ? [
      ['Сколько времени нужно каждый день?', 'На один языковой марафон планируйте от 15 минут в день. Дальше время зависит от задания и от того, сколько вы сами хотите заниматься.'],
      ['Когда открываются задания?', 'Задания открываются после регистрации и оплаты марафона в профиле участника.'],
      ['Есть ли бесплатные этапы?', 'Нет. Сейчас марафон оплачивается целиком, а после подтверждения оплаты открывается маршрут заданий.'],
      ['Как работают задания?', 'У каждого утвержденного задания есть инструкции, статус отчета и прогресс в профиле марафона.'],
    ]
    : [
      ['Как устроен марафон?', `Вы проходите 30-дневный маршрут: старт, ежедневные задания, проверка прогресса, оплата марафона и финиш с результатом уровня ${resultLevel}.`],
      ['Что происходит каждый день?', 'Каждый день есть одно языковое задание. Вы выполняете его, отправляете отчет и переходите к следующему дню.'],
      ['Почему регистрация закрыта?', 'Регистрация откроется после загрузки утвержденного активного марафона, заданий, платежного продукта.'],
      ['Где посмотреть статус запуска?', 'Откройте поддержку, чтобы посмотреть рабочие инструкции и проверки готовности.'],
    ];

  return (
    <div className="marathon-landing">
      <main>
        <section className="ml-hero">
          <div className="ml-hero-copy">
            <h1>{heroTitle}</h1>
            <p>{heroIntro}</p>
            <div className="ml-hero-actions">
              <button
                type="button"
                className={`ml-primary-action large${registrationOpen ? '' : ' is-closed'}`}
                onClick={scrollToForm}
                aria-describedby={registrationStatusId}
              >
                {heroCtaLabel}
              </button>
              <Link to={heroSecondary.to} className="ml-outline-action">{heroSecondary.label}</Link>
            </div>
            {!registrationOpen && (
              <p className="ml-availability-note" id="registration-status-note">
                Регистрация еще не открыта, но маршрут уже можно посмотреть: старт, ежедневное задание, отчет и финиш.
              </p>
            )}
            <dl className="ml-hero-points" aria-label="Показатели 30-дневного марафона">
              <div><dt>{formatCount(participantCount)}</dt><dd>{participantLabel}</dd></div>
              <div><dt>День 1</dt><dd>старт</dd></div>
              <div><dt>30</dt><dd>ежедневных заданий</dd></div>
              <div><dt>Финиш</dt><dd>уровень {resultLevel}</dd></div>
            </dl>
          </div>

          <div className="ml-race-hero" aria-label="Участники движутся от старта к финишу">
            <img src={MARATHON_IMAGES.hero} alt="Участники начинают маршрут марафона с отметками дней от 1 до 30" />
            <div className="ml-image-stage-label">Старт</div>
            <div className="ml-race-card">
              <strong>Маршрут на 30 дней</strong>
              <span className="ml-race-step is-start"><i aria-hidden="true" />Старт</span>
              <span className="ml-race-step is-daily"><i aria-hidden="true" />Ежедневное задание</span>
              <span className="ml-race-step is-report"><i aria-hidden="true" />Отчет</span>
              <span className="ml-race-step is-finish"><i aria-hidden="true" />Финиш</span>
            </div>
            <button
              type="button"
              className="ml-race-status"
              onClick={scrollToForm}
              aria-describedby={registrationStatusId}
            >
              <span>{registrationOpen ? 'Регистрация открыта' : 'Регистрация скоро откроется'}</span>
              <strong>{registrationOpen ? 'Начать сегодня' : 'Предпросмотр маршрута'}</strong>
            </button>
          </div>
        </section>

        <section className="ml-how" id="how">
          <div className="ml-section-head">
            <h2>Как работает 30-дневный марафон</h2>
            <p>
              Это не просто страница с уроками. Это ритм забега: уверенный старт, одно языковое задание каждый день и полный маршрут за 30 дней.
            </p>
          </div>
          <div className="ml-how-grid">
            <article><span>01</span><h3>Старт маршрута</h3><p>Выберите языковой марафон и войдите в маршрут с первого дня одним понятным действием.</p></article>
            <article><span>02</span><h3>Выполняйте одно задание в день</h3><p>Каждый день вы открываете следующее задание, выполняете языковую работу и отправляете отчет.</p></article>
            <article><span>03</span><h3>Финиш на 30-й день</h3><p>Финишная линия - это завершенный маршрут и результат уровня {resultLevel}, а не расплывчатое обещание.</p></article>
          </div>
          <div className="ml-how-route" aria-label="Графика маршрута от старта до финиша">
            <span className="ml-how-route-label">Старт</span>
            <div className="ml-how-route-days" aria-hidden="true">
              {Array.from({ length: 30 }, (_, index) => (
                <span key={index} className={index === 0 || index === 9 || index === 19 || index === 29 ? 'is-major' : undefined}>
                  {index + 1}
                </span>
              ))}
            </div>
            <span className="ml-how-route-finish">🏆 Финиш: {resultLevel}</span>
          </div>
        </section>

        <section className="ml-pricing" id="pricing">
          <div className="ml-section-head">
            <h2>От старта до финиша</h2>
            <p>{pricingIntro}</p>
          </div>
          <div className="ml-race-route">
            <div className="ml-route-line" aria-hidden="true">
              <span>День 1</span>
              <b className="ml-route-runner" aria-label="Бегущий участник движется к финишу">
                <img src={MARATHON_IMAGES.routeRunner} alt="" aria-hidden="true" />
              </b>
              <span>День 30</span>
            </div>
            <article>
              <h3>Старт</h3>
              <p>Регистрация ставит вас на маршрут. Профиль становится местом, где открывается следующий этап.</p>
            </article>
            <article>
              <h3>Ежедневный темп</h3>
              <p>Одно задание в день делает работу конкретной: читать, говорить, писать, отчитаться и продолжить.</p>
            </article>
            <article>
              <h3>Отчет</h3>
              <p>После задания вы пишете отчет о выполнении. Платформа фиксирует прогресс и открывает следующий день маршрута.</p>
            </article>
            <article>
              <h3>Финиш</h3>
              <p>На 30-й день у марафона есть ясный итог: маршрут пройден, цель достигнута, уровень {resultLevel} получен.</p>
            </article>
          </div>
        </section>

        <section className="ml-workflow" id="program">
          <div className="ml-section-head">
            <h2>Ваш ежедневный план</h2>
            <p>
              Марафон построен как движение: каждый день есть задание, и каждое задание приближает вас к 30-му дню.
            </p>
          </div>
          <div className="ml-training-split">
            <img src={MARATHON_IMAGES.dailyTask} alt="Участники марафона выполняют ежедневное задание рядом с беговой дорожкой" loading="lazy" />
            <div className="ml-day-row">
              <article className="ml-day-card state-done">
                <span>Разминка</span>
                <h3>Откройте день</h3>
                <small>5 минут</small>
                <p>Войдите в профиль, посмотрите сегодняшнее задание и что нужно закончить до следующей контрольной точки.</p>
              </article>
              <article className="ml-day-card state-start">
                <span>Основной забег</span>
                <h3>Выполните одно задание</h3>
                <small>Ежедневное задание</small>
                <p>Выполните языковую практику: говорите, пишите, слушайте или отвечайте согласно текущему этапу.</p>
              </article>
              <article className="ml-day-card state-finish">
                <span>Завершение</span>
                <h3>Отправьте и продолжайте</h3>
                <small>Прогресс сохранен</small>
                <p>Ваш отчет двигает маршрут дальше. Завтра вы вернетесь к следующему дню и так до финиша с результатом уровня {resultLevel}.</p>
              </article>
            </div>
          </div>
          {!registrationOpen && missingLaunchGates.length ? (
            <div className="ml-missing-gates ml-workflow-gates" aria-label="Недостающие условия запуска">
              <strong>Блокеры запуска</strong>
              <div>
                {missingLaunchGates.map((item) => (
                  <span key={item}>{formatMissingGate(item)}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>


        <CertificateShowcase
          id="landing-certificate"
          className="home-certificate-band"
          showStatus={false}
          showMockDetails
          title="Что получает финалист"
          lead="После финиша марафона участник получает статус «Сертификат» и медальную версию сертификата по результату прохождения."
        />

        <section className="ml-proof" id="winners">
          <div className="ml-section-head">
            <h2>30-й день — это финиш и результат</h2>
            <p>На финише участник завершает первый важный этап изучения языка и достигает результата уровня {resultLevel}.</p>
          </div>
          <div className="ml-finish-visual">
            <div className="ml-finish-image">
              <img src={MARATHON_IMAGES.finish} alt="Участники празднуют финиш на 30-й день" loading="lazy" />
              <div className="ml-image-stage-label">Финиш</div>
              <div className="ml-finish-ribbon-label">Языковой марафон на уровень А1</div>
            </div>
            <div>
              <h3>Старт. 30 дней. Уровень {resultLevel}.</h3>
              <p>Ежедневные задания делают маршрут измеримым. Финиш не абстрактный: через 30 дней участник достигает конкретной цели и получает результат уровня {resultLevel}.</p>
              <Link to="/winners" className="ml-primary-action">Посмотреть финалистов</Link>
            </div>
          </div>
          <div className="ml-review-grid">
            {featuredReviews.length ? featuredReviews.map((review) => (
              <article key={`${review.name}-${review.text}`} className="ml-review">
                {review.photo && <img src={review.photo} alt="" loading="lazy" />}
                <p>{review.text}</p>
                <strong>{review.name}</strong>
              </article>
            )) : (
              <article className="ml-review-empty" aria-live="polite">
                <h3>Отзывы появятся после первого запуска марафона.</h3>
                <p>
                  Карточки финалистов и отзывы участников появятся после того, как реальные участники завершат
                  утвержденные production-марафоны.
                </p>
                <Link to="/faq" className="ml-outline-action">Статус запуска</Link>
              </article>
            )}
          </div>
          <Link to="/winners" className="ml-text-link">Посмотреть финалистов</Link>
        </section>

        <section className="ml-faq" id="faq">
          <div>
            <h2>Есть вопросы? Мы поможем.</h2>
            <div className="ml-faq-list">
              {faqItems.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside>
            <h3>Остались вопросы?</h3>
            <p>Поддержка поможет с регистрацией, доступом к профилю, оплатой и вопросами по заданиям.</p>
            <Link to="/faq" className="ml-outline-action">Связаться с поддержкой</Link>
          </aside>
        </section>

        <section className={`ml-register${registrationOpen ? ' is-form-only' : ''}`} ref={formRef} id="register">
          {registrationOpen ? (
            <div className="ml-register-form-stack">
              <RegistrationForm
                languageCode={marathon.languageCode}
                marathonTitle={`${raceLanguageName} язык`}
                onSuccess={handleRegisterSuccess}
                onError={setFormError}
              />
              {registeredId && (
                <p className="ml-success">Регистрация получена. ID участника: {registeredId}</p>
              )}
              {formError && <p className="ml-error">{formError}</p>}
            </div>
          ) : (
            <>
              <div className="ml-register-copy">
                <h2>{registerTitle}</h2>
                <p>Регистрация откроется, когда этот языковой маршрут будет готов. Структуру 30-дневного марафона уже видно выше.</p>
              </div>
              <div className="ml-registration-unavailable">
                <h3>Регистрация еще не открыта</h3>
                <p>Кнопка старта откроется после готовности утвержденного маршрута, ежедневных заданий, платежного продукта в production.</p>
                {missingLaunchGates.length ? (
                  <div className="ml-missing-gates" aria-label="Недостающие условия запуска">
                    <strong>Блокеры запуска</strong>
                    <div>
                      {missingLaunchGates.map((item) => (
                        <span key={item}>{formatMissingGate(item)}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Link to="/faq" className="ml-outline-action">Связаться с поддержкой</Link>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="ml-footer">
        <div>
          <strong>Марафон <span>от Спикасап</span></strong>
        </div>
        <nav aria-label="Подвал">
          <Link to="/rules">Правила</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/profile">Мой марафон</Link>
        </nav>
      </footer>
    </div>
  );
}
