import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import FAQ from '../components/FAQ';
import '../landing.css';

interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  landingVideoUrl?: string;
}

interface Review {
  name: string;
  photo: string;
  text: string;
}

const FREE_DAYS = 3;

/** Language display name for Russian copy (e.g. "немецком", "английском"). */
function langDisplay(langCode: string): string {
  const map: Record<string, string> = {
    en: 'английском',
    de: 'немецком',
    fr: 'французском',
    es: 'испанском',
    it: 'итальянском',
  };
  return map[langCode] || langCode;
}

/**
 * Language landing: /:langSlug/. Full landing with promo, results, program,
 * reviews, video, certificates, FAQ, guarantee, motivation, registration.
 */
export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langSlug) return;
    Promise.all([
      fetch(`/api/v1/marathons/by-language/${encodeURIComponent(langSlug)}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch('/api/v1/reviews').then((r) => (r.ok ? r.json() : [])),
    ]).then(([marathonData, reviewsData]) => {
      setMarathon(marathonData);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [langSlug]);

  // SEO: title, meta description, canonical
  useEffect(() => {
    if (!marathon) return;
    const langName = marathon.title || marathon.languageCode;
    const title =
      marathon.languageCode === 'en'
        ? 'Языковой марафон-курс на уровень английского pre-Intermediate за 30 дней!'
        : `Языковой марафон-Курс: "${langName}" — А1 за 30 дней!`;
    document.title = title;
    const desc = `Изучите язык самостоятельно с гарантией результата за 30 дней! Языковой марафон — быстрое обучение для начинающих. ${FREE_DAYS} дня обучения бесплатно!`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
    const base = window.location.origin;
    const path = `/${marathon.languageCode}/`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${base}${path}`);
  }, [marathon]);

  const handleRegisterSuccess = () => setFormError('');

  const scrollToForm = () => {
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  if (loading) {
    return (
      <div className="landing-loading">
        <p>Загрузка…</p>
      </div>
    );
  }
  if (!marathon) {
    return (
      <div className="container">
        <p>Марафон не найден.</p>
        <Link to="/">На главную</Link>
      </div>
    );
  }

  const lang = langDisplay(marathon.languageCode);

  return (
    <div className="landing-page">
      {/* Block 1: Promo / Hero + Nav */}
      <header className="landing-promo">
        <nav className="landing-nav">
          <Link to="/" className="landing-brand">Speak<span>ASAP®</span></Link>
          <div className="landing-nav-links">
            <a href="#results">Что вас ждет</a>
            <a href="#program">Программа</a>
            <a href="#reviews">Отзывы</a>
            <a href="#faq">Вопросы</a>
            <button type="button" className="btn-landing-nav" onClick={scrollToForm}>
              Начать
            </button>
          </div>
        </nav>
        <div className="landing-hero">
          <h1 className="landing-hero-title">
            {marathon.languageCode === 'en'
              ? '30-дневный курс английского на уровень pre-Intermediate'
              : `Языковой марафон дает уровень А1 в ${lang} языке за 30 дней!`}
          </h1>
          <p className="landing-hero-sub">
            Самая эффективная методика, после которой вы заговорите на языке как на родном!
          </p>
          <p className="landing-hero-sub">
            {FREE_DAYS} дня обучения бесплатно!
          </p>
          <button type="button" className="btn-landing-cta" onClick={scrollToForm}>
            Начать бесплатно*
          </button>
          <p className="landing-hero-note">
            *Через {FREE_DAYS} дня стоимость марафона — по условиям на сайте.
          </p>
        </div>
      </header>

      {/* Block 2: Results / What you get */}
      <section className="landing-section landing-stripe" id="results">
        <div className="container">
          <h2>Что вы получите</h2>
          <div className="landing-circles">
            <div className="landing-circle">
              <div className="landing-circle-title">Основы грамматики</div>
              <p>Самые нужные грамматические конструкции и словарный запас для самостоятельного изучения.</p>
            </div>
            <div className="landing-circle">
              <div className="landing-circle-title">Эксклюзивные материалы</div>
              <p>Материалы, которые помогут выучить язык с интересом и научат находить время на учебу.</p>
            </div>
            <div className="landing-circle">
              <div className="landing-circle-title">Разговорная практика</div>
              <p>Организуем общение с носителем — проверите силы на практике.</p>
            </div>
            <div className="landing-circle">
              <div className="landing-circle-title">Результат за 30 дней</div>
              <p>Системный подход и поддержка кураторов для достижения цели.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Block 3: Program */}
      <section className="landing-section" id="program">
        <div className="container">
          <h2>Программа марафона</h2>
          <ul className="landing-steps-list">
            <li>Определение знаний и целей</li>
            <li>Базовая грамматика и лексика</li>
            <li>Упражнения</li>
            <li>Аудирование</li>
            <li>Общение с носителем</li>
          </ul>
        </div>
      </section>

      {/* Block 4: Reviews */}
      <section className="landing-section landing-reviews" id="reviews">
        <div className="container">
          <h2>Отзывы наших студентов</h2>
          {reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.slice(0, 5).map((r, i) => (
                <div key={i} className="review-card">
                  {r.photo && (
                    <img src={r.photo} alt="" className="review-photo" width={80} height={80} loading="lazy" />
                  )}
                  <div className="review-body">
                    <strong>{r.name}</strong>
                    <p>{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="landing-placeholder">Отзывы загружаются.</p>
          )}
        </div>
      </section>

      {/* Block 5: Video */}
      {marathon.landingVideoUrl && (
        <section className="landing-section" id="tour">
          <div className="container">
            <h2>Видео о марафоне</h2>
            <div className="landing-video-wrap">
              <iframe
                title="Марафон"
                src={marathon.landingVideoUrl}
                allowFullScreen
                className="landing-video"
              />
            </div>
          </div>
        </section>
      )}

      {/* Block 6: Certificates (short) */}
      <section className="landing-section landing-stripe">
        <div className="container">
          <h2>Сертификаты</h2>
          <p>По завершении марафона вы получите сертификат SpeakASAP®.</p>
        </div>
      </section>

      {/* Block 7: FAQ */}
      <FAQ />

      {/* Block 9: Guarantee */}
      <section className="landing-section landing-guarantee">
        <div className="container">
          <h2>Гарантия результата</h2>
          <p>Мы уверены в методике: выполняйте задания и следуйте программе — результат гарантирован.</p>
        </div>
      </section>

      {/* Block 8: Motivation */}
      <section className="landing-section landing-stripe">
        <div className="container">
          <h2>Начните уже сегодня</h2>
          <p>Присоединяйтесь к тысячам участников, которые уже достигли своих целей.</p>
          <button type="button" className="btn-landing-cta" onClick={scrollToForm}>
            Записаться на марафон
          </button>
        </div>
      </section>

      {/* Block 10: Registration form */}
      <section className="landing-section landing-form-section" ref={formRef} id="register">
        <div className="container">
          {formError && <p className="landing-form-error">{formError}</p>}
          <RegistrationForm
            languageCode={marathon.languageCode}
            marathonTitle={marathon.title}
            onSuccess={handleRegisterSuccess}
            onError={setFormError}
          />
        </div>
      </section>

      {/* Block 11: Footer */}
      <footer className="landing-footer">
        <div className="container">
          <Link to="/">Главная</Link>
          <span className="landing-footer-sep"> · </span>
          <Link to="/winners">Победители</Link>
          <p className="landing-footer-copy">© SpeakASAP®</p>
        </div>
      </footer>
    </div>
  );
}
