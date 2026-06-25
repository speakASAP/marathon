import { Link } from 'react-router-dom';
import { PUBLIC_MARATHON_LANGUAGES, getMarathonLandingPathFromSlug } from '../languages';

interface MarathonFooterLinksProps {
  className?: string;
}

export default function MarathonFooterLinks({ className = '' }: MarathonFooterLinksProps) {
  const rootClassName = ['marathon-footer-links', className].filter(Boolean).join(' ');

  return (
    <section className={rootClassName} aria-label="Языковые марафоны SpeakASAP">
      <Link to="/profile" className="marathon-footer-links__a1">
        Подготовка к уровню A1: выберите языковой марафон SpeakASAP
      </Link>
      <nav className="marathon-footer-links__nav" aria-label="Марафоны по иностранным языкам">
        {PUBLIC_MARATHON_LANGUAGES.map((language) => (
          <Link key={language.slug} to={getMarathonLandingPathFromSlug(language.slug)}>
            {language.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
