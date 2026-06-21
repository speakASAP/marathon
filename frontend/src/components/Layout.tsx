import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';
import MarathonFooterLinks from './MarathonFooterLinks';

/** Global shell: one shared Marathon header for every route. */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessError, setReadinessError] = useState('');
  const location = useLocation();
  const hideFooter = false;
  const registrationStatusUnavailable = Boolean(readinessError);
  const registrationClosed = !registrationStatusUnavailable && readiness?.registrationOpen !== true;
  const navRegistrationLabel = registrationStatusUnavailable
    ? 'Статус'
    : registrationClosed ? 'Скоро' : 'Регистрация';
  const navRegistrationTitle = registrationStatusUnavailable
    ? 'Статус регистрации недоступен. Откройте страницу регистрации для подробностей.'
    : undefined;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setReadinessError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setReadinessError('registration-status-unavailable');
      });
  }, []);

  return (
    <div className="layout-wrap">
      <header className="main-header" id="main-nav">
        <div className="container header-inner">
          <Link to="/" className="navbar-brand" aria-label="Главная Marathon">
            Marathon
            <span className="navbar-brand-provider">от SpeakASAP®</span>
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
            <Link
              to="/register"
              className={`btn btn-landing navbar-cta ${registrationClosed || registrationStatusUnavailable ? 'navbar-cta-closed' : 'btn-green'}`}
              title={navRegistrationTitle}
            >
              {navRegistrationLabel}
            </Link>
          </nav>
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
