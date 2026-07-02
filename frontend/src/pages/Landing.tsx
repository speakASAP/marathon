import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import CertificateShowcase from '../components/CertificateShowcase';
import {
  fetchCatalogReadiness,
  fetchMarathonByLanguage,
  fetchMarathonLanguages,
  fetchPublicReviewsPage,
  type CatalogReadiness,
  type MarathonLanguage,
  type MarathonSummary,
  type PublicReview,
  type PublicReviewsPage,
} from '../api/publicMarathon';
import { PUBLIC_MARATHON_LANGUAGES, formatLanguageLabel } from '../languages';
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

function formatReviewWord(count: number): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;

  if (mod10 === 1 && mod100 !== 11) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'отзыва';
  return 'отзывов';
}

export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const isLanguageLanding = Boolean(langSlug && langSlug !== 'landing');
  const effectiveLangSlug = isLanguageLanding && langSlug ? langSlug : 'de';
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState<PublicReviewsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const languageBandRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      fetchMarathonByLanguage(effectiveLangSlug),
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
      fetchPublicReviewsPage(1, 24).catch((): PublicReviewsPage => ({
        items: [],
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
      })),
    ])
      .then(([marathonData, langs, readinessData, reviewsData]) => {
        setMarathon(marathonData || {
          id: 'fallback',
          languageCode: effectiveLangSlug,
          title: '',
        });
        setLanguages(langs);
        setReadiness(readinessData);
        setReviews(reviewsData.items);
        setReviewsPage(reviewsData);
      })
      .catch(() => {
        setMarathon(null);
        setLanguages([]);
        setReadiness(null);
        setReviews([]);
        setReviewsPage(null);
        setLoadError('Страница марафона не загрузилась. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
      })
      .finally(() => setLoading(false));
  }, [effectiveLangSlug]);

  useEffect(() => {
    if (!marathon) return;

    if (!isLanguageLanding) {
      document.title = 'Языковой марафон SpeakASAP — выберите язык';
    } else {
      const langName = formatLanguageName(marathon);
      const metaReady = marathon.id !== 'fallback' && readiness?.registrationOpen === true;
      document.title = metaReady
        ? `${langName} марафон — языковая практика SpeakASAP`
        : `${langName} марафон — статус регистрации`;
    }

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (!isLanguageLanding) {
      meta.setAttribute(
        'content',
        'Выберите языковой марафон SpeakASAP: 30-дневный маршрут, ежедневные задания, прогресс и финиш с результатом уровня A1.',
      );
    } else {
      const langName = formatLanguageName(marathon);
      const metaReady = marathon.id !== 'fallback' && readiness?.registrationOpen === true;
      meta.setAttribute(
        'content',
        metaReady
          ? `Присоединяйтесь к марафону ${langName} от SpeakASAP: утвержденные задания, оплату через профиль и отслеживание прогресса.`
          : `Регистрация на марафон ${langName} откроется после загрузки утвержденного каталога, заданий и платежного продукта.`,
      );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', isLanguageLanding ? `${window.location.origin}/${marathon.languageCode}/` : `${window.location.origin}/`);
  }, [isLanguageLanding, marathon, readiness]);

  const fallbackLanguages = useMemo<MarathonLanguage[]>(
    () => PUBLIC_MARATHON_LANGUAGES.map((language) => ({
      code: language.code,
      name: language.label.replace(/\s+A1$/, ''),
      url: `/${language.slug}/`,
    })),
    [],
  );
  const featuredLanguages = useMemo(() => {
    const source = languages.length ? languages : fallbackLanguages;
    return [...source].sort((a, b) => formatLanguageLabel(a.code, a.name).localeCompare(formatLanguageLabel(b.code, b.name), 'ru'));
  }, [fallbackLanguages, languages]);
  const featuredReviews = useMemo(() => reviews.slice(0, 3), [reviews]);
  const defaultRegistrationLanguage = isLanguageLanding
    ? { code: marathon?.languageCode || effectiveLangSlug, name: marathon ? formatLanguageName(marathon) : effectiveLangSlug }
    : featuredLanguages[0];
  const reviewCount = reviewsPage?.total ?? reviews.length;
  const reviewsCtaLabel = reviewCount > 0
    ? `Почитать ${formatCount(reviewCount)} ${formatReviewWord(reviewCount)}`
    : 'Почитать отзывы';

  useEffect(() => {
    if (loading || loadError || !marathon || window.location.hash !== "#register") return;
    const id = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [loading, loadError, marathon]);


  const scrollToStart = () => {
    const target = isLanguageLanding ? formRef.current : languageBandRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          </div>
        </section>
      </div>
    );
  }

  if (!marathon) {
    return (
      <div className="container page-static">
        <p>Данные марафона временно недоступны.</p>
      </div>
    );
  }

  const raceLanguageName = isLanguageLanding ? formatLanguageName(marathon) : 'языковой марафон';
  const participantCount = isLanguageLanding
    ? marathon.participantCount
    : readiness?.counts.registeredParticipants;
  const participantLabel = isLanguageLanding ? 'участников в этом марафоне' : 'участников уже зарегистрированы';
  const resultLevel = isLanguageLanding && marathon.languageCode.toLowerCase() === 'en' ? 'pre-intermediate' : 'A1';
  const hasActiveMarathon = marathon.id !== 'fallback';
  const registrationOpen = isLanguageLanding ? hasActiveMarathon && readiness?.registrationOpen === true : readiness?.registrationOpen === true;
  const registrationStatusId = !registrationOpen && isLanguageLanding ? 'registration-status-note' : undefined;
  const heroCtaLabel = isLanguageLanding ? (registrationOpen ? 'Начать 30-дневный марафон' : 'Посмотреть маршрут на 30 дней') : 'Выбрать язык марафона';
  const heroStatusLabel = isLanguageLanding
    ? (registrationOpen ? 'Регистрация открыта' : 'Регистрация скоро откроется')
    : 'Выберите язык';
  const heroStatusStrong = isLanguageLanding
    ? (registrationOpen ? 'Начать сегодня' : 'Предпросмотр маршрута')
    : 'Открыть список марафонов';
  const heroSecondary = registrationOpen
    ? { to: '/profile', label: 'Открыть мой марафон' }
    : { to: '/register', label: 'Выбрать язык марафона' };
  const pricingIntro = `Марафон устроен как забег: начните со старта, каждый день выполняйте одно задание и придите к финишу с результатом уровня ${resultLevel}.`;
  const heroTitle = isLanguageLanding
    ? (registrationOpen ? `Пройдите марафон ${raceLanguageName} за 30 дней` : `Марафон ${raceLanguageName} начинается с движения.`)
    : 'Пройдите языковой марафон за 30 дней';
  const heroIntro = isLanguageLanding
    ? (registrationOpen
      ? `Начните с первого дня, каждый день выполняйте одно языковое задание, следите за темпом в профиле и на финише получите результат уровня ${resultLevel}.`
      : `Наглядный 30-дневный маршрут от старта до финиша: каждый день вы проходите один этап, выполняете задание и движетесь к результату уровня ${resultLevel}.`)
    : `Выберите язык, начните с первого дня, каждый день выполняйте одно задание и двигайтесь к результату уровня ${resultLevel}.`;
  const registerTitle = isLanguageLanding
    ? (registrationOpen ? `Старт марафона: ${raceLanguageName}` : 'Регистрация скоро откроется')
    : 'Выберите язык марафона';
  const missingLaunchGates = readiness?.missing ?? [];
  const faqItems = registrationOpen
    ? [
      ['Сколько времени нужно каждый день?', 'На один языковой марафон планируйте от 30 минут в день. Дальше время зависит от задания и от того, сколько вы сами хотите заниматься.'],
      ['Когда открываются задания?', 'Задания открываются ежедневно по расписанию. По желанию участника можно открыть внеочередные задания и идти быстрее.'],
      ['Как работают задания?', 'У каждого утвержденного задания есть инструкции, статус отчета и прогресс в профиле марафона.'],
      ['Где оплатить участие?', 'После выбора языка перейдите к регистрации. Оплата открывается на странице марафона и в профиле участника.'],
      ['Можно ли проходить марафон быстрее?', 'Да. Если хотите идти быстрее ежедневного расписания, открывайте внеочередные задания и выполняйте их в удобном темпе.'],
      ['Где смотреть свой прогресс?', 'Прогресс, открытые задания, отчеты и статус оплаты отображаются в профиле участника.'],
      ['Что делать, если пропустили день?', 'Продолжайте с текущего открытого задания. Марафон сохраняет ваш прогресс, и вы можете вернуться к выполнению в профиле.'],
      ['Можно ли участвовать в нескольких марафонах?', 'Да, можно выбрать несколько языков. На каждый языковой марафон планируйте отдельные 30 минут в день.'],
    ]
    : [
      ['Как устроен марафон?', `Вы проходите 30-дневный маршрут: старт, ежедневные задания, проверка прогресса, оплата марафона и финиш с результатом уровня ${resultLevel}.`],
      ['Что происходит каждый день?', 'Каждый день есть одно языковое задание. Вы выполняете его, отправляете отчет и переходите к следующему дню.'],
      ['Почему регистрация закрыта?', 'Регистрация откроется после загрузки утвержденного активного марафона, заданий, платежного продукта.'],
      ['Где посмотреть статус запуска?', 'Статус регистрации и доступные языки отображаются на странице регистрации.'],
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
                onClick={scrollToStart}
                aria-describedby={registrationStatusId}
              >
                {heroCtaLabel}
              </button>
              <Link to={heroSecondary.to} className="ml-outline-action">{heroSecondary.label}</Link>
            </div>
            {!registrationOpen && isLanguageLanding && (
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
              onClick={scrollToStart}
              aria-describedby={registrationStatusId}
            >
              <span>{heroStatusLabel}</span>
              <strong>{heroStatusStrong}</strong>
            </button>
          </div>
        </section>

        {!isLanguageLanding && (
          <section className="home-language-band" aria-labelledby="home-language-title" ref={languageBandRef}>
            <div>
              <h2 id="home-language-title">Выберите язык марафона</h2>
              <p>Выберите язык прямо здесь, укажите email и телефон — регистрация начнется без лишнего перехода.</p>
            </div>
            <div className="home-language-register">
              {registrationOpen && defaultRegistrationLanguage ? (
                <>
                  <RegistrationForm
                    languageCode={defaultRegistrationLanguage.code}
                    marathonTitle={formatLanguageLabel(defaultRegistrationLanguage.code, defaultRegistrationLanguage.name)}
                    languages={featuredLanguages}
                    onSuccess={handleRegisterSuccess}
                    onError={setFormError}
                  />
                  {registeredId && <p className="ml-success">Регистрация получена. ID участника: {registeredId}</p>}
                  {formError && <p className="ml-error">{formError}</p>}
                </>
              ) : (
                <Link to="/register" className="home-language-chip is-status">Статус регистрации</Link>
              )}
            </div>
          </section>
        )}

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
                  Отзывы участников появятся после того, как реальные участники завершат
                  утвержденные production-марафоны.
                </p>
                <Link to="/faq" className="ml-outline-action">Статус запуска</Link>
              </article>
            )}
          </div>
          <Link to="/reviews" className="ml-text-link">{reviewsCtaLabel}</Link>
        </section>

        <section className="ml-faq" id="faq">
          <div>
            <h2>Частые вопросы перед стартом</h2>
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
            <h3>Готовы начать?</h3>
            <p>Выберите язык марафона, оплатите участие на странице регистрации и приступайте к заданиям в профиле.</p>
            <button type="button" className="ml-outline-action" onClick={scrollToStart}>Перейти к регистрации</button>
          </aside>
        </section>

        <section className={`ml-register${registrationOpen ? ' is-form-only' : ''}`} ref={formRef} id="register">
          {registrationOpen && defaultRegistrationLanguage ? (
            <div className="ml-register-form-stack">
              <RegistrationForm
                languageCode={defaultRegistrationLanguage.code}
                marathonTitle={formatLanguageLabel(defaultRegistrationLanguage.code, defaultRegistrationLanguage.name)}
                languages={featuredLanguages}
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
                <p>{isLanguageLanding ? 'Регистрация откроется, когда этот языковой маршрут будет готов. Структуру 30-дневного марафона уже видно выше.' : 'На главной странице выберите язык. Регистрация и конкретный маршрут откроются на странице выбранного марафона.'}</p>
              </div>
              <div className="ml-registration-unavailable">
                <h3>{isLanguageLanding ? 'Регистрация еще не открыта' : 'Сначала выберите язык'}</h3>
                <p>{isLanguageLanding ? 'Кнопка старта откроется после готовности утвержденного маршрута, ежедневных заданий, платежного продукта в production.' : 'Каждый языковой марафон ведет к своей странице с маршрутом, статусом и регистрацией.'}</p>
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
                <button type="button" className="ml-outline-action" onClick={scrollToStart}>
                  {isLanguageLanding ? 'Посмотреть регистрацию' : 'Выбрать язык'}
                </button>
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
