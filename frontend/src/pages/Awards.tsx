import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Awards / certificates page. Content from legacy awards_view.html, gift.html.
 */
export default function Awards() {
  useEffect(() => {
    document.title = 'Награды и сертификаты — Marathon';
  }, []);

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мой профиль</Link>
      </nav>
      <h1>Награды и сертификаты</h1>
      <div className="static-content">
        <p>По завершении марафона финалисты получают награды и сертификаты SpeakASAP®.</p>
        <p>Сертификат подтверждает прохождение языкового марафона и достигнутый уровень.</p>
        <p>Подробности о призах и условиях получения — в разделе марафона и в письмах от организаторов.</p>
      </div>
    </div>
  );
}
