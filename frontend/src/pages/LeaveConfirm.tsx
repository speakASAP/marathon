import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Leave marathon confirmation. Legacy leave_confirm.html.
 * Actual leave flow (API) to be added when backend supports it.
 */
export default function LeaveConfirm() {
  useEffect(() => {
    document.title = 'Выход из марафона — Marathon';
  }, []);

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мой профиль</Link>
      </nav>
      <h1>Выход из марафона</h1>
      <div className="static-content">
        <p>Если вы хотите выйти из марафона, обратитесь в поддержку или используйте настройки в личном кабинете.</p>
        <p><Link to="/profile">Перейти в мой профиль</Link></p>
      </div>
    </div>
  );
}
