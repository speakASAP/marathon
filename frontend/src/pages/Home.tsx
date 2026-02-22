import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Lang {
  code: string;
  name: string;
  url?: string;
}

/**
 * Home: hub with links to language landings and winners/reviews.
 */
export default function Home() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/marathons/languages')
      .then((r) => r.json())
      .then((data: Lang[]) => {
        setLanguages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1>Marathon</h1>
      <nav className="page-nav">
        <Link to="/winners">Финалисты</Link>
        <span> · </span>
        <Link to="/reviews">Отзывы</Link>
        <span> · </span>
        <Link to="/about">О марафоне</Link>
        <span> · </span>
        <Link to="/rules">Правила</Link>
        <span> · </span>
        <Link to="/faq">Помощь</Link>
        <span> · </span>
        <Link to="/profile">Мой профиль</Link>
        <span> · </span>
        <Link to="/register">Регистрация</Link>
        <span> · </span>
        <Link to="/awards">Награды</Link>
        <span> · </span>
        <Link to="/support">Поддержка</Link>
      </nav>
      <section>
        <h2>Языковые марафоны</h2>
        {loading && <p>Загрузка…</p>}
        <ul>
          {languages.map((lang) => (
            <li key={lang.code}>
              <Link to={`/${lang.code}/`}>{lang.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
