import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Review {
  name: string;
  photo: string;
  text: string;
}

/**
 * Reviews page: GET /api/v1/reviews. Full list of static reviews.
 */
export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Отзывы — Marathon';
    fetch('/api/v1/reviews')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container page-reviews">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/winners">Финалисты</Link>
      </nav>
      <h1>Отзывы наших студентов</h1>
      {loading && <p>Загрузка…</p>}
      {!loading && reviews.length === 0 && <p>Нет отзывов.</p>}
      {!loading && reviews.length > 0 && (
        <ul className="reviews-list-page">
          {reviews.map((r, i) => (
            <li key={i} className="review-card">
              {r.photo && (
                <img src={r.photo} alt="" className="review-photo" width={80} height={80} loading="lazy" />
              )}
              <div className="review-body">
                <strong>{r.name}</strong>
                <p>{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
