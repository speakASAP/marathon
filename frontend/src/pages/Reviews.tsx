import { useEffect, useMemo, useState } from 'react';
import {
  fetchPublicReviewsPage,
  type PublicReview,
  type PublicReviewsPage,
} from '../api/publicMarathon';

const PAGE_SIZE = 24;

export default function Reviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [pageInfo, setPageInfo] = useState<PublicReviewsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Отзывы — Марафон';
    loadPage(1, true);
  }, []);

  const shownPages = useMemo(() => {
    if (!pageInfo || pageInfo.totalPages === 0) {
      return '0 из 0';
    }
    return `${pageInfo.page} из ${pageInfo.totalPages}`;
  }, [pageInfo]);

  async function loadPage(page: number, replace = false) {
    setError('');
    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await fetchPublicReviewsPage(page, PAGE_SIZE);
      setPageInfo(data);
      setReviews((current) => replace ? data.items : [...current, ...data.items]);
    } catch {
      setError('Отзывы временно не загрузились. Обновите страницу или попробуйте позже.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  return (
    <div className="container page-reviews">
      <header className="reviews-heading">
        <div>
          <h1>Отзывы наших студентов</h1>
          <p>Реальные отзывы участников после завершённых языковых марафонов.</p>
        </div>
        <dl className="reviews-stats" aria-label="Статистика отзывов">
          <div>
            <dt>Всего отзывов</dt>
            <dd>{pageInfo?.total ?? 0}</dd>
          </div>
          <div>
            <dt>Страницы</dt>
            <dd>{shownPages}</dd>
          </div>
        </dl>
      </header>

      {loading && <p>Загрузка…</p>}
      {error && <p className="ml-error">{error}</p>}
      {!loading && reviews.length === 0 && !error && <p>Нет отзывов.</p>}
      {!loading && reviews.length > 0 && (
        <>
          <ul className="reviews-list-page">
            {reviews.map((review, index) => (
              <li key={review.id || `${review.name}-${index}`} className="review-card">
                {review.photo && (
                  <img src={review.photo} alt="" className="review-photo" width={80} height={80} loading="lazy" />
                )}
                <div className="review-body">
                  <div className="review-card-head">
                    <strong>{review.name}</strong>
                    {review.marathon && <span>{review.marathon}</span>}
                  </div>
                  {review.text && <p>{review.text}</p>}
                  {review.thanks && <p className="review-thanks">{review.thanks}</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="reviews-pagination" aria-live="polite">
            <span>
              Показано {reviews.length} из {pageInfo?.total ?? reviews.length}. Страница {shownPages}.
            </span>
            {pageInfo?.nextPage && (
              <button
                type="button"
                className="ml-primary-action"
                onClick={() => loadPage(pageInfo.nextPage || 1)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка...' : 'Показать ещё'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
