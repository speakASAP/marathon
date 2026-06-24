import { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { fetchCatalogReadiness, fetchMarathonLanguages, type CatalogReadiness, type MarathonLanguage } from '../api/publicMarathon';
import { MarathonAuthRequiredError, fetchMyMarathons, fetchMyProfile, type MarathonUserProfileSettings } from '../api/profileMarathon';
import MarathonFooterLinks from './MarathonFooterLinks';
import { clearToken, getToken } from '../auth';
import { PUBLIC_MARATHON_LANGUAGES, formatLanguageOptionLabel } from '../languages';

/** Global shell: one shared Marathon header for every route. */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessError, setReadinessError] = useState('');
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));
  const [hasRegisteredMarathon, setHasRegisteredMarathon] = useState(false);
  const [selectedPaymentRequiredProfile, setSelectedPaymentRequiredProfile] = useState('');
  const [profile, setProfile] = useState<MarathonUserProfileSettings | null>(null);
  const location = useLocation();
  const hideFooter = false;
  const registrationStatusUnavailable = Boolean(readinessError);
  const registrationClosed = !registrationStatusUnavailable && readiness?.registrationOpen !== true;
  const navRegistrationLabel = 'Регистрация';
  const navRegistrationTitle = registrationStatusUnavailable
    ? 'Статус регистрации недоступен. Откройте страницу регистрации для подробностей.'
    : undefined;

  const languageOptions = useMemo<MarathonLanguage[]>(() => {
    if (languages.length) return languages;
    return PUBLIC_MARATHON_LANGUAGES.map((language) => ({
      code: language.code,
      name: language.label.replace(/\s+A1$/, ''),
      url: `/${language.slug}/`,
    }));
  }, [languages]);
  const currentLanguagePath = useMemo(() => {
    const normalizedPath = location.pathname.replace(/\/$/, '') || '/';
    const match = languageOptions.find((language) => {
      const href = language.url || `/${language.code}/`;
      const pathname = href.startsWith('http') ? new URL(href).pathname : href;
      const normalizedLanguagePath = pathname.replace(/\/$/, '') || '/';
      return normalizedPath === normalizedLanguagePath || normalizedPath === `/${language.code}`;
    });
    if (!match) return '';
    return match.url || `/${match.code}/`;
  }, [languageOptions, location.pathname]);

  const hasSelectedMarathonContext = useMemo(() => {
    const queryMarathonerId = new URLSearchParams(location.search).get('marathonerId')?.trim();
    const profilePathParts = location.pathname.split('/').filter(Boolean);
    return Boolean(queryMarathonerId) || (profilePathParts[0] === 'profile' && profilePathParts.length === 2);
  }, [location.pathname, location.search]);
  const selectedProfileId = useMemo(() => {
    const queryMarathonerId = new URLSearchParams(location.search).get('marathonerId')?.trim();
    if (queryMarathonerId) return queryMarathonerId;
    const profilePathParts = location.pathname.split('/').filter(Boolean);
    if (profilePathParts[0] === 'profile' && profilePathParts.length === 2) return profilePathParts[1];
    return '';
  }, [location.pathname, location.search]);
  const hideRegistrationNavigation = hasSelectedMarathonContext || hasRegisteredMarathon;
  const showSelectedPaymentAction = Boolean(selectedPaymentRequiredProfile);
  const profileAvatarUrl = profile?.avatarUrl?.trim() || '';
  const profileInitial = (profile?.displayName?.trim().charAt(0) || 'Я').toUpperCase();

  useEffect(() => {
    setMenuOpen(false);
    const tokenPresent = Boolean(getToken());
    setHasToken(tokenPresent);
    setSelectedPaymentRequiredProfile('');
    if (!tokenPresent) {
      setHasRegisteredMarathon(false);
      setProfile(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!hasToken) return;
    let ignore = false;

    const loadProfile = () => {
      fetchMyProfile()
        .then((settings) => {
          if (!ignore) setProfile(settings);
        })
        .catch((error) => {
          if (ignore) return;
          if (error instanceof MarathonAuthRequiredError) {
            clearToken();
            setHasToken(false);
            setHasRegisteredMarathon(false);
          }
          setProfile(null);
        });
    };

    fetchMyMarathons()
      .then((items) => {
        if (ignore) return;
        setHasRegisteredMarathon(items.length > 0);
        const selected = selectedProfileId ? items.find((item) => item.id === selectedProfileId) : null;
        setSelectedPaymentRequiredProfile(selected?.payment_required ? selected.id : '');
      })
      .catch(() => {
        if (!ignore) {
          setHasRegisteredMarathon(false);
          setSelectedPaymentRequiredProfile('');
        }
      });
    loadProfile();

    const handleProfileUpdated = (event: Event) => {
      const nextProfile = (event as CustomEvent<MarathonUserProfileSettings | undefined>).detail;
      if (nextProfile) {
        setProfile(nextProfile);
        return;
      }
      loadProfile();
    };

    window.addEventListener('marathon-profile-updated', handleProfileUpdated);
    return () => {
      ignore = true;
      window.removeEventListener('marathon-profile-updated', handleProfileUpdated);
    };
  }, [hasToken, selectedProfileId]);

  useEffect(() => {
    setReadinessError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setReadinessError('registration-status-unavailable');
      });
    fetchMarathonLanguages()
      .then((items) => setLanguages(items))
      .catch(() => setLanguages([]));
  }, []);

  return (
    <div className="layout-wrap">
      <header className="main-header" id="main-nav">
        <div className="container header-inner">
          <Link to="/" className="navbar-brand" aria-label="Главная Марафон от speakasap">
            Марафон
            <span className="navbar-brand-provider">от speakasap</span>
          </Link>
          <nav className={`main-nav-links ${menuOpen ? 'main-nav-links--open' : ''}`}>
            <Link to="/winners">Финалисты</Link>
            <Link to="/reviews">Отзывы</Link>
            <Link to="/about">О марафоне</Link>
            <Link to="/rules">Правила</Link>
            <Link to="/faq">Помощь</Link>
            <Link to="/profile">Мой профиль</Link>
            <Link to="/awards">Награды</Link>
            <Link to="/support">Поддержка</Link>
          </nav>
          <div className="header-actions">
            {!hideRegistrationNavigation && (
              <label className="navbar-language-select">
                <span>Язык</span>
                <select
                  value={currentLanguagePath}
                  onChange={(event) => {
                    if (event.target.value) window.location.href = event.target.value;
                  }}
                  aria-label="Выбор языка марафона"
                >
                  <option value="">Выберите язык</option>
                  {languageOptions.map((language) => (
                    <option key={language.code} value={language.url || `/${language.code}/`}>
                      {formatLanguageOptionLabel(language.code, language.name)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {showSelectedPaymentAction && (
              <a className="btn btn-landing navbar-cta btn-green" href="#payment-access">
                Оплатить
              </a>
            )}
            {hasToken ? (
              <Link to="/profile" className="navbar-profile-avatar" aria-label="Мой профиль" title="Мой профиль">
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : <span>{profileInitial}</span>}
              </Link>
            ) : !hideRegistrationNavigation ? (
              <Link
                to="/register"
                className={`btn btn-landing navbar-cta ${registrationClosed || registrationStatusUnavailable ? 'navbar-cta-closed' : 'btn-green'}`}
                title={navRegistrationTitle}
              >
                {navRegistrationLabel}
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            className="navbar-toggle"
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      {!hideFooter && (
      <footer className="main-footer">
        <div className="container footer-inner">
          <div className="footer-col">
            <p className="footer-company">Компания SpeakASAP®</p>
            <p>Skopalikova 1144/11<br />615 00, Brno, Czech Republic</p>
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
            <a href="https://speakasap.com/policy/" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
          </div>
          <MarathonFooterLinks className="footer-marathons" />
        </div>
        <div className="container footer-copy">
          <p>Copyright © SpeakASAP® 2010–{new Date().getFullYear()}</p>
          <p>ШИПИЛОВА®, SpeakASAP® и логотип SpeakASAP® — зарегистрированные торговые знаки Alfares s.r.o.</p>
        </div>
      </footer>
      )}
    </div>
  );
}
