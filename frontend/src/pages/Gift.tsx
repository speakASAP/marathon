import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Gift page. Legacy gift.html; redirect-style or same as awards.
 */
export default function Gift() {
  useEffect(() => {
    document.title = 'Подарки марафона — Marathon';
  }, []);

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/awards">Награды</Link>
      </nav>
      <h1>Подарки марафона</h1>
      <div className="static-content">
        <p>Участники марафона могут получить подарки по условиям текущего марафона.</p>
        <p>Подробности — в разделе <Link to="/awards">Награды и сертификаты</Link> и в материалах марафона.</p>
      </div>
    </div>
  );
}
