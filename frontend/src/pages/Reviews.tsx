import { useEffect, useState } from 'react';
import { fetchPublicReviews, type PublicReview } from '../api/publicMarathon';

/**
 * Reviews page: GET /api/v1/reviews. Full list of static reviews.
 */
export default function Reviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Отзывы — Marathon';
    fetchPublicReviews()
      .then((data) => setReviews(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page-reviews">
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
