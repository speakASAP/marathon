import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchPublicReviewsPage,
  type PublicReview,
  type PublicReviewsPage,
} from '../api/publicMarathon';
import { PUBLIC_MARATHON_LANGUAGES, formatLanguageFlag, formatLanguageLabel, getMarathonLandingPath } from '../languages';

const PAGE_SIZE = 24;
const PAGE_QUERY_PARAM = 'page';
const LANGUAGE_QUERY_PARAM = 'language';

type PageButton = number | 'gap';

function readPageParam(searchParams: URLSearchParams): number {
  const rawPage = Number(searchParams.get(PAGE_QUERY_PARAM) || '1');
  return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
}

function readLanguageParam(searchParams: URLSearchParams): string {
  return (searchParams.get(LANGUAGE_QUERY_PARAM) || '').toLowerCase().replace(/[^a-z]/g, '');
}

function buildPageButtons(currentPage: number, totalPages: number): PageButton[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) {
      return ['gap' as const, page];
    }
    return [page];
  });
}

function ReviewMarathonLink({ review }: { review: PublicReview }) {
  if (!review.languageCode) return null;

  const landingPath = getMarathonLandingPath(review.languageCode);
  if (!landingPath) return null;

  const label = formatLanguageLabel(review.languageCode, review.marathon);
  return (
    <Link
      className="review-language-badge"
      to={landingPath}
      title={`Открыть марафон: ${label}`}
      aria-label={`Открыть марафон: ${label}`}
    >
      <span aria-hidden="true">{formatLanguageFlag(review.languageCode)}</span>
      {label}
    </Link>
  );
}

export default function Reviews() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = readPageParam(searchParams);
  const selectedLanguageCode = readLanguageParam(searchParams);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [pageInfo, setPageInfo] = useState<PublicReviewsPage | null>(null);
  const [jumpPage, setJumpPage] = useState(String(currentPage));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Отзывы — Марафон';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setLoading(true);
    setJumpPage(String(currentPage));

    fetchPublicReviewsPage(currentPage, PAGE_SIZE, selectedLanguageCode)
      .then((data) => {
        if (cancelled) return;
        setPageInfo(data);
        setReviews(data.items);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Отзывы временно не загрузились. Обновите страницу или попробуйте позже.');
        setReviews([]);
        setPageInfo(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, selectedLanguageCode]);

  const shownPages = useMemo(() => {
    if (!pageInfo || pageInfo.totalPages === 0) {
      return '0 из 0';
    }
    return `${pageInfo.page} из ${pageInfo.totalPages}`;
  }, [pageInfo]);

  const pageButtons = useMemo(
    () => buildPageButtons(pageInfo?.page || currentPage, pageInfo?.totalPages || 0),
    [currentPage, pageInfo],
  );

  const selectedLanguageLabel = selectedLanguageCode
    ? formatLanguageLabel(selectedLanguageCode)
    : 'всем языкам';

  function goToPage(page: number) {
    const totalPages = pageInfo?.totalPages || page;
    const safePage = Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages));
    const nextParams = new URLSearchParams(searchParams);
    if (safePage === 1) {
      nextParams.delete(PAGE_QUERY_PARAM);
    } else {
      nextParams.set(PAGE_QUERY_PARAM, String(safePage));
    }
    setSearchParams(nextParams);
  }

  function selectLanguage(languageCode: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(PAGE_QUERY_PARAM);
    if (languageCode) {
      nextParams.set(LANGUAGE_QUERY_PARAM, languageCode);
    } else {
      nextParams.delete(LANGUAGE_QUERY_PARAM);
    }
    setSearchParams(nextParams);
  }

  function submitPageJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedPage = Number(jumpPage);
    if (!Number.isFinite(requestedPage)) return;
    goToPage(requestedPage);
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

      <section className="reviews-language-filter" aria-label="Фильтр отзывов по языку">
        <div className="reviews-language-filter__label">Отзывы по языку</div>
        <div className="reviews-language-filter__buttons">
          <button
            type="button"
            className="review-language-badge reviews-language-filter__all"
            aria-pressed={!selectedLanguageCode}
            onClick={() => selectLanguage('')}
          >
            Все языки
          </button>
          {PUBLIC_MARATHON_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              className="review-language-badge"
              aria-pressed={selectedLanguageCode === language.code}
              onClick={() => selectLanguage(language.code)}
            >
              <span aria-hidden="true">{formatLanguageFlag(language.code)}</span>
              {formatLanguageLabel(language.code)}
            </button>
          ))}
        </div>
      </section>

      {loading && <p>Загрузка…</p>}
      {error && <p className="ml-error">{error}</p>}
      {!loading && reviews.length === 0 && !error && <p>Нет отзывов по фильтру: {selectedLanguageLabel}.</p>}
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
                    <div className="review-card-meta">
                      <ReviewMarathonLink review={review} />
                    </div>
                  </div>
                  {review.text && <p>{review.text}</p>}
                  {review.thanks && <p className="review-thanks">{review.thanks}</p>}
                </div>
              </li>
            ))}
          </ul>

          <nav className="reviews-pagination" aria-label="Навигация по страницам отзывов">
            <span>
              Показано {reviews.length} из {pageInfo?.total ?? reviews.length}. Страница {shownPages}.
            </span>
            <div className="reviews-page-controls">
              <button
                type="button"
                className="reviews-page-button"
                onClick={() => goToPage(pageInfo?.prevPage || 1)}
                disabled={!pageInfo?.prevPage}
                aria-label="Предыдущая страница отзывов"
              >
                Назад
              </button>
              <div className="reviews-page-numbers" aria-label="Страницы отзывов">
                {pageButtons.map((page, index) => page === 'gap' ? (
                  <span key={`gap-${index}`} className="reviews-page-gap" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    className="reviews-page-button"
                    aria-current={pageInfo?.page === page ? 'page' : undefined}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="reviews-page-button"
                onClick={() => goToPage(pageInfo?.nextPage || pageInfo?.page || 1)}
                disabled={!pageInfo?.nextPage}
                aria-label="Следующая страница отзывов"
              >
                Вперёд
              </button>
              <form className="reviews-page-jump" onSubmit={submitPageJump}>
                <label htmlFor="reviews-page-jump">Страница</label>
                <input
                  id="reviews-page-jump"
                  type="number"
                  min="1"
                  max={pageInfo?.totalPages || undefined}
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value)}
                />
                <button type="submit" className="ml-primary-action">Открыть</button>
              </form>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
