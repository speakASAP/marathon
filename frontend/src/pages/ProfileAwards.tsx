import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getLoginUrl, getPasswordResetUrl } from '../auth';
import {
  MarathonAuthRequiredError,
  MarathonNotFoundError,
  fetchMyMarathon,
  fetchMyProfile,
  type MarathonUserProfileSettings,
  type MyMarathon,
} from '../api/profileMarathon';
import { formatLanguageLabel } from '../languages';
import { stripHeadingTerminalPeriod } from '../components/assignment/assignmentBlockNormalization';

type MedalKind = 'gold' | 'silver' | 'bronze';

const BOOK_PRIZE_URL = 'https://speakasap.com/media/steps/german/tochka_vixoda_iz_yazika_ili_kak_brosit_ychit_yazik_buch.pdf';

const MEDAL_COPY: Record<MedalKind, { title: string; certificate: string; discount: string; className: string }> = {
  gold: {
    title: 'Золотой финиш',
    certificate: 'Золотой сертификат финалиста',
    discount: '10% скидка на следующий курс SpeakASAP',
    className: 'gold',
  },
  silver: {
    title: 'Серебряный финиш',
    certificate: 'Серебряный сертификат финалиста',
    discount: '10% скидка на следующий курс SpeakASAP',
    className: 'silver',
  },
  bronze: {
    title: 'Бронзовый финиш',
    certificate: 'Бронзовый сертификат финалиста',
    discount: '5% скидка на следующий курс SpeakASAP',
    className: 'bronze',
  },
};

const AWARD_LANGUAGE_COPY: Record<string, { dative: string; nextStep: string; hashtag: string }> = {
  en: { dative: 'английскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения английского языка с нами:', hashtag: '#english_speakASAP' },
  de: { dative: 'немецкому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения немецкого языка с нами:', hashtag: '#german_speakASAP' },
  es: { dative: 'испанскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения испанского языка с нами:', hashtag: '#spanish_speakASAP' },
  fr: { dative: 'французскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения французского языка с нами:', hashtag: '#french_speakASAP' },
  it: { dative: 'итальянскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения итальянского языка с нами:', hashtag: '#italian_speakASAP' },
  cz: { dative: 'чешскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения чешского языка с нами:', hashtag: '#czech_speakASAP' },
  tr: { dative: 'турецкому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения турецкого языка с нами:', hashtag: '#turkish_speakASAP' },
  pt: { dative: 'португальскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения португальского языка с нами:', hashtag: '#portuguese_speakASAP' },
  nl: { dative: 'нидерландскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения нидерландского языка с нами:', hashtag: '#dutch_speakASAP' },
  pl: { dative: 'польскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения польского языка с нами:', hashtag: '#polish_speakASAP' },
  no: { dative: 'норвежскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения норвежского языка с нами:', hashtag: '#norwegian_speakASAP' },
  se: { dative: 'шведскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения шведского языка с нами:', hashtag: '#swedish_speakASAP' },
  dk: { dative: 'датскому', nextStep: 'Вы можете выбрать для себя дальнейший путь изучения датского языка с нами:', hashtag: '#danish_speakASAP' },
};

const AWARD_LANGUAGE_ALIASES: Record<string, string> = {
  cs: 'cz',
  nb: 'no',
  nn: 'no',
  sv: 'se',
  da: 'dk',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function certificateImage(medal: MedalKind) {
  return `/img/certificates/${medal}_en.png`;
}

function resolveParticipantName(profile: MarathonUserProfileSettings | null) {
  return profile?.displayName?.trim() || 'Финалист SpeakASAP';
}

function resolveAwardLanguageCopy(code: string) {
  const normalized = code.toLowerCase();
  return AWARD_LANGUAGE_COPY[AWARD_LANGUAGE_ALIASES[normalized] || normalized] || {
    dative: 'выбранному',
    nextStep: 'Вы можете выбрать для себя дальнейший путь изучения языка с нами:',
    hashtag: '#speakASAP_marathon',
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

export default function ProfileAwards() {
  const { marathonerId } = useParams<{ marathonerId: string }>();
  const [data, setData] = useState<MyMarathon | null>(null);
  const [profile, setProfile] = useState<MarathonUserProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!marathonerId) return;
    setLoading(true);
    setUnauth(false);
    setNotFound(false);
    setLoadError('');

    Promise.all([fetchMyMarathon(marathonerId), fetchMyProfile()])
      .then(([marathonData, profileData]) => {
        setData(marathonData);
        setProfile(profileData);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setUnauth(true);
        } else if (error instanceof MarathonNotFoundError) {
          setNotFound(true);
        } else {
          setLoadError('Страница призов временно недоступна. Обновите страницу или обратитесь в поддержку.');
        }
      })
      .finally(() => setLoading(false));
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `Призы: ${data.title} - Марафон`;
  }, [data]);

  const participantName = resolveParticipantName(profile);
  const medal = data?.medal || null;
  const medalCopy = medal ? MEDAL_COPY[medal] : null;
  const languageLabel = data ? formatLanguageLabel(data.languageCode, data.title) : '';
  const awardCopy = data ? resolveAwardLanguageCopy(data.languageCode) : resolveAwardLanguageCopy('');
  const certificateLanguage = awardCopy.dative;
  const finishedDate = data?.finished_at ? formatDate(data.finished_at) : '';

  const certificateLines = useMemo(() => [
    participantName,
    'За успешный забег по',
    `${certificateLanguage} языку`,
    finishedDate,
  ], [certificateLanguage, finishedDate, participantName]);

  const downloadCertificate = async () => {
    if (!data?.medal || !data.finished_at) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const image = await loadImage(certificateImage(data.medal));
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 620;
      canvas.height = image.naturalHeight || 877;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is not available');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.fillStyle = '#26324a';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '700 30px Georgia, serif';
      context.fillText(participantName, canvas.width / 2, Math.round(canvas.height * 0.63), canvas.width * 0.72);
      context.font = '500 22px Georgia, serif';
      context.fillText('За успешный забег по', canvas.width / 2, Math.round(canvas.height * 0.68), canvas.width * 0.7);
      context.fillText(`${certificateLanguage} языку`, canvas.width / 2, Math.round(canvas.height * 0.71), canvas.width * 0.7);
      context.font = '500 18px Georgia, serif';
      context.fillText(finishedDate, canvas.width / 2, Math.round(canvas.height * 0.775), canvas.width * 0.4);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `speakASAP_Marathon_${data.languageCode}_${data.medal}.png`;
      link.click();
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Сертификат не удалось сформировать.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-static profile-awards-page">
        <p>Загрузка призов...</p>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="container page-static profile-awards-page">
        <h1>Войдите, чтобы получить призы</h1>
        <section className="profile-empty-panel" role="alert">
          <p>Призы и сертификат доступны только владельцу завершенного марафона.</p>
          <div className="profile-payment-actions">
            <a className="btn-profile-open" href={getLoginUrl(`/profile/${marathonerId}/awards`)}>
              Войти с email или телефоном
            </a>
            <a className="btn-profile-login" href={getPasswordResetUrl()}>Восстановить пароль</a>
          </div>
        </section>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container page-static profile-awards-page">
        <h1>Призы не найдены</h1>
        <p>Марафон не найден в вашем профиле.</p>
        <Link to="/profile" className="btn-profile-login">К моим марафонам</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static profile-awards-page">
        <h1>Призы временно недоступны</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </section>
      </div>
    );
  }

  if (!data.finished_at || !data.medal || data.payment_required) {
    return (
      <div className="container page-static profile-awards-page">
        <h1>Призы откроются на финише</h1>
        <section className="profile-empty-panel" role="alert">
          <p>Эта страница открывается после завершения оплаченного марафона.</p>
          <Link to={`/profile/${encodeURIComponent(data.id)}`} className="btn-profile-open">Вернуться в профиль</Link>
        </section>
      </div>
    );
  }

  return (
    <main className="container page-static profile-awards-page">
      <section className={`profile-awards-hero profile-awards-hero-${medalCopy?.className}`}>
        <div>
          <p className="profile-completion-kicker">Теперь самое время получать призы</p>
          <h1>{medalCopy?.title}</h1>
          <p>
            {stripHeadingTerminalPeriod(data.title)} завершен {finishedDate}. Ниже ваши призы,
            сертификат и ссылки для следующего шага.
          </p>
        </div>
        <div className="profile-awards-medal" aria-label={medalCopy?.certificate}>
          <span className={`medal-badge medal-badge--${data.medal}`}>
            <span className="medal-badge__medal" aria-hidden="true">
              <span className="medal-badge__ribbon" />
              <span className="medal-badge__coin">1</span>
            </span>
            <span className="medal-badge__label">{medalCopy?.certificate}</span>
          </span>
        </div>
      </section>

      <section className="profile-awards-certificate">
        <div className="profile-certificate-preview" aria-label="Именной сертификат финалиста">
          <img src={certificateImage(data.medal)} alt={medalCopy?.certificate} width="620" height="877" />
          <span className="profile-certificate-name">{certificateLines[0]}</span>
          <span className="profile-certificate-line profile-certificate-line-one">{certificateLines[1]}</span>
          <span className="profile-certificate-line profile-certificate-line-two">{certificateLines[2]}</span>
          <span className="profile-certificate-date">{certificateLines[3]}</span>
        </div>
        <div className="profile-awards-copy">
          <h2>Сертификат об окончании марафона</h2>
          <p>
            Legacy Marathon генерировал такой сертификат из медальной заготовки, имени участника,
            языка и даты финиша. В новой версии сертификат формируется прямо на этой странице.
          </p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={downloadCertificate} disabled={downloading}>
              {downloading ? 'Формируем...' : 'Скачать сертификат PNG'}
            </button>
            <Link to={`/profile/${encodeURIComponent(data.id)}`} className="btn-profile-login">
              Вернуться в профиль
            </Link>
          </div>
          {downloadError && <p className="ml-error">{downloadError}</p>}
        </div>
      </section>

      <section className="profile-awards-grid" aria-label="Призы финалиста">
        <article>
          <span className="profile-awards-card-icon">PDF</span>
          <h2>Книга «Точка выхода»</h2>
          <p>Legacy-приз для финалистов: PDF-книга о том, как перестать бесконечно учить язык и начать им пользоваться.</p>
          <a className="btn-profile-open" href={BOOK_PRIZE_URL} target="_blank" rel="noreferrer">
            Скачать книгу
          </a>
        </article>
        <article>
          <span className="profile-awards-card-icon">%</span>
          <h2>Скидка на следующий курс</h2>
          <p>{medalCopy?.discount}. Legacy-страница выдавала персональный код на 14 дней после финиша.</p>
          <Link className="btn-profile-open" to="/faq">
            Получить код через поддержку
          </Link>
        </article>
        <article>
          <span className="profile-awards-card-icon">🏆</span>
          <h2>Кубок и медаль финалиста</h2>
          <p>
            Ваш результат сохранен в профиле и в списке финалистов: {formatLanguageLabel(data.languageCode, languageLabel)}.
            Legacy-хэштег для отзыва: {awardCopy.hashtag}.
          </p>
          <Link className="btn-profile-open" to="/winners">
            Посмотреть финалистов
          </Link>
        </article>
      </section>

      <section className="profile-awards-next">
        <h2>Что дальше?</h2>
        <p>{awardCopy.nextStep}</p>
        <div className="profile-payment-actions">
          <Link className="btn-profile-open" to="/register">Выбрать следующий марафон</Link>
          <Link className="btn-profile-login" to="/reviews">Оставить отзыв</Link>
        </div>
      </section>
    </main>
  );
}
