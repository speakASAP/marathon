import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Lang {
  code: string;
  name: string;
}

/**
 * Standalone registration: choose language and go to landing with registration form.
 */
export default function Register() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Регистрация на марафон — Marathon';
    fetch('/api/v1/marathons/languages')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setLanguages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Регистрация на марафон</h1>
      <p>Выберите язык марафона и перейдите на страницу регистрации.</p>
      {loading && <p>Загрузка…</p>}
      <ul className="register-lang-list">
        {languages.map((lang) => (
          <li key={lang.code}>
            <Link to={`/${lang.code}/#register`}>{lang.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
