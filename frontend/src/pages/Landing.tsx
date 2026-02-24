import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import FAQ from '../components/FAQ';
import '../landing.css';

const PROGRAM_STEPS = [
  { id: 1, title: 'Определение знаний и целей', text: 'Прежде чем кидаться в сотый раз в иностранный язык, нужно понять, для чего это нужно и какие знания уже имеются.' },
  { id: 2, title: 'Базовая грамматика и лексика', text: 'Самые нужные грамматические конструкции и словарный запас. Какая грамматика и лексика нужны, чтобы начать говорить?' },
  { id: 3, title: 'Упражнения', text: 'В марафоне разработаны такие упражнения, которые вам захочется делать ежедневно.' },
  { id: 4, title: 'Аудирование', text: 'Видео- и аудиоматериалы отобраны в марафоне. Разберёмся с проблемой аудирования и как её решать.' },
  { id: 5, title: 'Общение с носителем', text: 'Носители языка в нашем марафоне помогут разговорить вас и заставят поверить в себя.' },
];

/** Default price (EUR) when API does not return it (legacy parity). */
const DEFAULT_PRICE_EUR = 29;

interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  landingVideoUrl?: string;
  price?: number;
}

interface LangItem {
  code: string;
  name: string;
  url?: string;
}

interface Review {
  name: string;
  photo: string;
  text: string;
}

const FREE_DAYS = 3;

/**
 * Language landing: /:langSlug/. Legacy structure (speakasap-portal templates/new/marathons/index.html):
 * promo, language selector, advantages, Full/Free cards, certificates, reviews, trust, contacts, footer.
 */
export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [programTab, setProgramTab] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langSlug) return;
    Promise.all([
      fetch(`/api/v1/marathons/by-language/${encodeURIComponent(langSlug)}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch('/api/v1/marathons/languages').then((r) => r.ok ? r.json() : []).then((d: LangItem[]) => (Array.isArray(d) ? d : [])),
      fetch('/api/v1/reviews').then((r) => (r.ok ? r.json() : [])),
    ]).then(([marathonData, langs, reviewsData]) => {
      setMarathon(marathonData);
      setLanguages(langs);
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

  const priceEur = marathon.price ?? DEFAULT_PRICE_EUR;
  const defaultVideoUrl = 'https://www.youtube.com/embed/oUTnzwEVTww';

  return (
    <div className="landing-page">
      {/* Legacy: section-marathon-promo — hero with language bg */}
      <section className={`section-marathon section-marathon-promo promo-lang-${marathon.languageCode}`}>
        <div id="marathon-bg" className="landing-promo-bg" aria-hidden="true" />
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
        <div className="container">
          <h1>
            {marathon.languageCode === 'en'
              ? 'Уровень pre-Intermediate за 30 дней!'
              : 'Уровень А1 за 30 дней!'}
          </h1>
          <button type="button" className="btn-landing-cta" onClick={scrollToForm}>
            Начать бесплатно*
          </button>
          <p className="landing-hero-note">
            *Через {FREE_DAYS} дня стоимость марафона — по условиям на сайте.
          </p>
        </div>
      </section>

      {/* Legacy: language selector top */}
      <div className="section-marathon section-marathon-dark lang-selector-top">
        <div className="container">
          <h2 className="text-center">Выберите язык</h2>
          <div className="lang-selector-grid">
            {languages.map((l) => (
              <Link key={l.code} to={`/${l.code}/`}>{l.name}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Legacy: "Что вы получите" — advantages + video */}
      <div className="section-marathon section-marathon-advantages" id="results">
        <div className="container">
          <h2>Что вы получите</h2>
          <div className="advantages">
            <div className="col-sm-4 adv-block">
              <div className="adv-img-2" />
              <h3>Результат</h3>
              <p>Уровень А1</p>
            </div>
            <div className="col-sm-4 adv-block">
              <div className="adv-img-1" />
              <h3>Время</h3>
              <p>30 дней</p>
            </div>
            <div className="col-sm-4 adv-block">
              <div className="adv-img-3" />
              <h3>Низкая цена за А1</h3>
              <p>{priceEur}&euro;</p>
            </div>
          </div>
          <div className="row-video">
            <div className="embed-responsive-16by9" style={{ maxWidth: 560 }}>
              <iframe
                title="Марафон"
                src={marathon.landingVideoUrl || defaultVideoUrl}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legacy: "Получи А1 через 30 дней!" — Full course / Free course cards */}
      <div className="section-marathon section-marathon-dark">
        <div className="container">
          <h2>Получи А1 через 30 дней!</h2>
          <div className="row-cards">
            <div className="col-sm-6 pb-4">
              <div className="marathon-card-basic">
                <h3>Полный курс</h3>
                <div className="card-list">
                  {['Определение знаний и целей', 'Базовая грамматика и лексика', 'Упражнения', 'Количество дней = 30', 'Аудирование', 'Гарантия уровень A1', 'Общение с носителем', 'Скидки на дальнейшее обучение', 'Полезные призы', 'Получение сертификата', 'Чеклист по темам грамматики с нуля до В2'].map((text) => (
                    <div key={text} className="card-list-item">
                      <i className="check fa fa-fw fa-check" /> <span>{text}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Link to="/register" className="btn btn-landing btn-green">
                    Записаться на полный курс
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-sm-6 pb-4">
              <div className="marathon-card-free">
                <h3>Бесплатный курс</h3>
                <div className="card-list">
                  {[
                    { text: 'Определение знаний и целей', lock: false },
                    { text: 'Базовая грамматика и лексика', lock: false },
                    { text: 'Упражнения', lock: false },
                    { text: 'Количество дней = 8', lock: false },
                    { text: 'Аудирование', lock: false },
                    { text: 'Гарантия уровень A1', lock: true },
                    { text: 'Общение с носителем', lock: true },
                    { text: 'Скидки на дальнейшее обучение', lock: true },
                    { text: 'Полезные призы', lock: true },
                    { text: 'Получение сертификата', lock: true },
                  ].map(({ text, lock }) => (
                    <div key={text} className="card-list-item">
                      {lock ? <i className="lock fa fa-fw fa-lock" /> : <i className="check fa fa-fw fa-check" />}
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button type="button" className="btn btn-landing btn-green" onClick={scrollToForm}>
                    Начать бесплатно
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy: certificates block */}
      <div className="section-marathon section-marathon-white">
        <div className="container">
          <h2>Выполни все задания и получи Золотой Сертификат!</h2>
        </div>
        <div className="certs-view">
          <img className="gold" src="/img/certificates/gold_en.png" alt="Золотой сертификат" loading="lazy" />
          <img className="silver" src="/img/certificates/silver_en.png" alt="Серебряный сертификат" loading="lazy" />
          <img className="bronze" src="/img/certificates/bronze_en.png" alt="Бронзовый сертификат" loading="lazy" />
        </div>
      </div>

      {/* Legacy: reviews */}
      <div className="section-marathon section-marathon-reviews" id="reviews">
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
      </div>

      {/* Legacy: "Почему нам доверяют" */}
      <div className="section-marathon section-marathon-advantages">
        <div className="container">
          <h2>Почему нам доверяют</h2>
          <div className="advantages">
            <div className="col-sm-4 adv-block">
              <div className="adv-img-4" />
              <h3>Работаем с 2010 года</h3>
            </div>
            <div className="col-sm-4 adv-block">
              <div className="adv-img-5" />
              <h3>18 иностранных языков</h3>
            </div>
            <div className="col-sm-4 adv-block">
              <div className="adv-img-6" />
              <h3>Более 60.000 марафонцев</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy: contacts */}
      <div className="section-marathon section-marathon-contacts">
        <div className="container">
          <h2>Свяжитесь с нами</h2>
          <div className="row-cards" style={{ alignItems: 'flex-start' }}>
            <div className="support-bg" style={{ flex: '0 0 33%', minHeight: 120 }} />
            <div style={{ flex: '1 1 200px' }}>
              <h3>Общие вопросы</h3>
              <ul className="support-links">
                <li><i className="fa fa-fw fa-envelope-o" /> <a href="mailto:contact@speakasap.com">contact@speakasap.com</a></li>
                <li><i className="fa fa-fw fa-phone" /> <a href="tel:+420773979939">+420 773 979 939</a></li>
                <li><i className="fa fa-fw fa-whatsapp" /> <a href="https://wa.me/420773979939">WhatsApp</a></li>
                <li><i className="fa fa-fw fa-telegram" /> <a href="https://t.me/speak_ASAP">Telegram</a></li>
              </ul>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <h3>Техническая поддержка</h3>
              <ul className="support-links">
                <li><i className="fa fa-fw fa-envelope-o" /> <a href="mailto:support@speakasap.com">support@speakasap.com</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy: language selector bottom */}
      <div className="section-marathon section-marathon-dark">
        <div className="container">
          <div className="lang-selector-grid">
            {languages.map((l) => (
              <Link key={l.code} to={`/${l.code}/`}>{l.name}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Legacy: CTA bottom */}
      <div className="section-marathon section-marathon-white">
        <div className="container text-center">
          <button type="button" className="btn-landing-cta" onClick={scrollToForm}>
            Начать бесплатно
          </button>
        </div>
      </div>

      {/* Program (tabs) — legacy block3 style */}
      <section className="landing-section" id="program">
        <div className="container">
          <h2>Программа марафона</h2>
          <div className="landing-program-tabs">
            {PROGRAM_STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                className={programTab === i ? 'active' : ''}
                onClick={() => setProgramTab(i)}
              >
                {step.title}
              </button>
            ))}
          </div>
          <div className="landing-program-pane">
            <h3>{PROGRAM_STEPS[programTab].title}</h3>
            <p>{PROGRAM_STEPS[programTab].text}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Guarantee */}
      <section className="landing-section landing-guarantee">
        <div className="container">
          <h2>Гарантия результата</h2>
          <p>Мы уверены в методике: выполняйте задания и следуйте программе — результат гарантирован.</p>
        </div>
      </section>

      {/* Registration form */}
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

      {/* Footer (legacy block11) */}
      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer-inner">
            <div className="footer-col">
              <p className="footer-company">Компания SpeakASAP®</p>
              <p>Skopalikova 1144/11, 615 00 Brno, Czech Republic</p>
              <p><a href="mailto:marathon@speakasap.com">marathon@speakasap.com</a></p>
            </div>
            <div className="footer-col footer-social">
              <a href="https://www.youtube.com/@Speak_ASAP?sub_confirmation=1" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i className="fa fa-youtube" /></a>
              <a href="https://vk.com/topic-34179942_28421383" target="_blank" rel="noopener noreferrer" aria-label="VK"><i className="fa fa-vk" /></a>
              <a href="https://facebook.com/speakASAP" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fa fa-facebook" /></a>
              <a href="https://t.me/speak_ASAP" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><i className="fa fa-telegram" /></a>
              <a href="https://instagram.com/shipilova_speakasap" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fa fa-instagram" /></a>
            </div>
            <div className="footer-col">
              <Link to="/">Главная</Link>
              <span className="landing-footer-sep"> · </span>
              <Link to="/winners">Победители</Link>
              <br />
              <a href="https://speakasap.com/privacy/" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
            </div>
          </div>
          <p className="landing-footer-copy">Copyright © SpeakASAP® 2010–{new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
