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
import { drawCertificateFields } from '../certificateRenderer';

type MedalKind = 'gold' | 'silver' | 'bronze';
type CertificateDownloadFormat = 'png' | 'jpeg' | 'pdf';
type ShareStatusKind = 'success' | 'fallback' | 'error';


const CERTIFICATE_DOWNLOAD_FORMATS: Array<{ format: CertificateDownloadFormat; label: string }> = [
  { format: 'png', label: 'PNG' },
  { format: 'pdf', label: 'PDF' },
  { format: 'jpeg', label: 'JPEG' },
];

const BOOK_PRIZE_URL = 'https://speakasap.com/media/steps/german/tochka_vixoda_iz_yazika_ili_kak_brosit_ychit_yazik_buch.pdf';
const SHARE_FALLBACK_DELAY_MS = 3600;


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
    discount: '10% скидка на следующий курс SpeakASAP',
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

function resolveParticipantName(data: MyMarathon | null, profile: MarathonUserProfileSettings | null) {
  return profile?.displayName?.trim()
    || data?.certificate_name_confirmation.confirmedName
    || data?.certificate_name_confirmation.currentName
    || data?.certificate?.participantName
    || 'Финалист SpeakASAP';
}
function resolveAwardLanguageCopy(code: string) {
  const normalized = code.toLowerCase();
  return AWARD_LANGUAGE_COPY[AWARD_LANGUAGE_ALIASES[normalized] || normalized] || {
    dative: 'выбранному',
    nextStep: 'Вы можете выбрать для себя дальнейший путь изучения языка с нами:',
    hashtag: '#speakASAP_marathon',
  };
}

function buildBasicCourseUrl(code: string) {
  const normalized = code.toLowerCase().replace(/[^a-z]/g, '');
  const courseCode = AWARD_LANGUAGE_ALIASES[normalized] || normalized || 'de';
  const url = new URL(`https://speakasap.com/${courseCode}/`);
  url.searchParams.set('utm_source', 'marathon');
  url.searchParams.set('utm_medium', 'awards_next_step');
  url.searchParams.set('utm_campaign', 'basic_20_week_course');
  return url.toString();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Сертификат не удалось подготовить для скачивания.'));
      }
    }, type, quality);
  });
}

function buildCertificateFilename(data: MyMarathon, extension: string) {
  return `speakASAP_Marathon_${data.languageCode}_${data.medal}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfBlobFromCanvas(canvas: HTMLCanvasElement) {
  const encoder = new TextEncoder();
  const jpegBytes = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.94));
  const pageWidth = canvas.width;
  const pageHeight = canvas.height;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/CertificateImage Do\nQ\n`;
  const chunks: BlobPart[] = [];
  const offsets: number[] = [];
  let byteLength = 0;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    byteLength += bytes.length;
  };
  const appendObject = (id: number, body: string | Uint8Array, suffix = '\nendobj\n') => {
    offsets[id] = byteLength;
    append(`${id} 0 obj\n`);
    append(body);
    append(suffix);
  };

  append('%PDF-1.4\n');
  appendObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  appendObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  appendObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /CertificateImage 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = byteLength;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  append(jpegBytes);
  append('\nendstream\nendobj\n');
  appendObject(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);

  const xrefOffset = byteLength;
  append('xref\n0 6\n0000000000 65535 f\n');
  for (let id = 1; id <= 5; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n\n`);
  }
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
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
  const [shareStatus, setShareStatus] = useState<{ kind: ShareStatusKind; message: string } | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<CertificateDownloadFormat | null>(null);
  const [sharingCertificate, setSharingCertificate] = useState(false);
  const [winnerLinkStatus, setWinnerLinkStatus] = useState('');
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

  const participantName = resolveParticipantName(data, profile);
  const medal = data?.medal || null;
  const medalCopy = medal ? MEDAL_COPY[medal] : null;
  const languageLabel = data ? formatLanguageLabel(data.languageCode) : '';
  const awardCopy = data ? resolveAwardLanguageCopy(data.languageCode) : resolveAwardLanguageCopy('');
  const basicCourseUrl = data ? buildBasicCourseUrl(data.languageCode) : buildBasicCourseUrl('de');
  const certificateLanguage = awardCopy.dative;
  const finishedDate = data?.finished_at ? formatDate(data.finished_at) : '';
  const bookPrize = data?.prizes?.find((prize) => prize.kind === 'book') || null;
  const discountPrize = data?.prizes?.find((prize) => prize.kind === 'discount') || null;
  const discountValidUntil = discountPrize?.validUntil ? formatDate(discountPrize.validUntil) : '';
  const shareUrl = data ? `${window.location.origin}/profile/${encodeURIComponent(data.id)}/awards` : window.location.href;
  const finalistProfilePath = data?.certificate?.winnerUrlHint || '/winners';
  const finalistProfileUrl = data ? `${window.location.origin}${finalistProfilePath}` : window.location.href;
  const shareText = data
    ? `Я завершил(а) ${stripHeadingTerminalPeriod(data.title)} и получил(а) сертификат SpeakASAP.`
    : 'Мой сертификат SpeakASAP готов.';

  const certificateLines = useMemo(() => [
    participantName,
    'За успешный забег по',
    `${certificateLanguage} языку`,
    finishedDate,
  ], [certificateLanguage, finishedDate, participantName]);

  const buildCertificateCanvas = async () => {
    if (!data?.medal || !data.finished_at) return;
    const image = await loadImage(certificateImage(data.medal));
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 620;
    canvas.height = image.naturalHeight || 877;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawCertificateFields(context, canvas, {
      participantName,
      languageDative: certificateLanguage,
      finishedDate,
    });

    return canvas;
  };

  const downloadCertificate = async (format: CertificateDownloadFormat) => {
    if (!data?.medal || !data.finished_at) return;
    setDownloadingFormat(format);
    setDownloadError('');
    setShareStatus(null);
    try {
      const canvas = await buildCertificateCanvas();
      if (!canvas) return;
      if (format === 'pdf') {
        downloadBlob(buildPdfBlobFromCanvas(canvas), buildCertificateFilename(data, 'pdf'));
      } else if (format === 'jpeg') {
        downloadBlob(await canvasToBlob(canvas, 'image/jpeg', 0.94), buildCertificateFilename(data, 'jpg'));
      } else {
        downloadBlob(await canvasToBlob(canvas, 'image/png'), buildCertificateFilename(data, 'png'));
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Сертификат не удалось сформировать.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const shareCertificate = async () => {
    if (!data?.medal || !data.finished_at || sharingCertificate) return;
    setSharingCertificate(true);
    setDownloadError('');
    setShareStatus(null);

    try {
      const canvas = await buildCertificateCanvas();
      if (!canvas) return;
      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const file = new File([pngBlob], buildCertificateFilename(data, 'png'), { type: 'image/png' });
      const sharePayload = {
        title: 'Мой сертификат SpeakASAP',
        text: shareText,
        url: shareUrl,
        files: [file],
      };

      if (navigator.canShare?.(sharePayload) && navigator.share) {
        await navigator.share(sharePayload);
        setShareStatus({ kind: 'success', message: 'Открылось системное меню: выберите Telegram, WhatsApp, Instagram или другое приложение.' });
        return;
      }

      downloadBlob(pngBlob, file.name);
      let copiedShareText = false;
      try {
        await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
        copiedShareText = true;
      } catch {
        copiedShareText = false;
      }
      setShareStatus({
        kind: 'fallback',
        message: copiedShareText
          ? 'PNG скачан, а текст со ссылкой скопирован. Его можно вставить в любой чат или соцсеть.'
          : 'PNG скачан. Если браузер не разрешил копирование, отправьте файл и добавьте ссылку из адресной строки.',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Не удалось подготовить сертификат для отправки.',
      });
    } finally {
      window.setTimeout(() => setSharingCertificate(false), SHARE_FALLBACK_DELAY_MS);
    }
  };

  const copyFinalistProfileLink = async () => {
    setWinnerLinkStatus('');
    try {
      await navigator.clipboard?.writeText(finalistProfileUrl);
      setWinnerLinkStatus('Ссылка на ваш профиль финалиста скопирована.');
    } catch {
      setWinnerLinkStatus('Скопируйте ссылку из адресной строки после открытия профиля.');
    }

    window.setTimeout(() => {
      setWinnerLinkStatus('');
    }, 5000);
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
          <Link to={`/profile/${encodeURIComponent(data.id)}`} className="btn-profile-open">Вернуться в профиль марафона</Link>
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
            {stripHeadingTerminalPeriod(data.title)} завершен {finishedDate}. Поздравляем с
            {` ${medalCopy?.certificate.toLowerCase()}`}: ниже собраны ваши заслуженные призы -
            книга, сертификат, медаль и персональная скидка за труд, время и усилия, которые привели
            вас к финишу.
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
            Это ваш заслуженный сертификат финишера. За ним стоят дни дисциплины, десятки выполненных
            заданий, смелость говорить, ошибаться, снова пробовать и идти вперед даже тогда, когда было
            непросто. Вы дошли до финиша, потому что учились по-настоящему: работали, старались,
            преодолевали усталость и каждый день становились сильнее в языке. Пусть этот результат
            напоминает вам: вы уже умеете доводить большое дело до конца, а значит следующий уровень
            вам тоже по силам. Поздравляем с победой и желаем идти дальше с тем же огнем, уверенностью
            и радостью от каждого нового шага.
          </p>
          <div className="profile-certificate-share">
            <button
              type="button"
              className="btn-profile-open profile-certificate-share__primary"
              onClick={shareCertificate}
              disabled={sharingCertificate || downloadingFormat !== null}
            >
              {sharingCertificate ? 'Готовим сертификат...' : 'Поделиться сертификатом'}
            </button>
            <p>
              На телефоне откроется системное меню отправки. На компьютере мы скачаем PNG и скопируем текст со ссылкой.
            </p>
          </div>
          <div className="profile-certificate-downloads" aria-label="Скачать сертификат">
            {CERTIFICATE_DOWNLOAD_FORMATS.map(({ format, label }) => (
              <button
                key={format}
                type="button"
                className="btn-profile-open"
                onClick={() => downloadCertificate(format)}
                disabled={downloadingFormat !== null}
              >
                {downloadingFormat === format ? 'Формируем...' : `Скачать ${label}`}
              </button>
            ))}
            <Link to={`/profile/${encodeURIComponent(data.id)}`} className="btn-profile-login">
              Вернуться в профиль марафона
            </Link>
          </div>
          {shareStatus && <p className={`profile-certificate-share-status profile-certificate-share-status--${shareStatus.kind}`}>{shareStatus.message}</p>}
          {downloadError && <p className="ml-error">{downloadError}</p>}
        </div>
      </section>

      <section className="profile-awards-grid" aria-label="Призы финалиста">
        <article>
          <span className="profile-awards-card-icon">PDF</span>
          <h2>Книга «Точка выхода»</h2>
          <p>PDF-книга о том, как перестать бесконечно учить язык и начать им пользоваться.</p>
          <a className="btn-profile-open" href={bookPrize?.actionHref || BOOK_PRIZE_URL} target="_blank" rel="noreferrer">
            {bookPrize?.actionLabel || 'Скачать книгу'}
          </a>
        </article>
        <article>
          <span className="profile-awards-card-icon">%</span>
          <h2>Скидка на следующий курс</h2>
          <p>
            {discountPrize?.title || medalCopy?.discount}. Ваш персональный код действует 14 дней
            после финиша и будет передан на страницу курса автоматически.
          </p>
          {discountPrize?.discountCode ? (
            <p className="profile-awards-code"><strong>{discountPrize.discountCode}</strong></p>
          ) : null}
          {discountValidUntil ? <p>Действует до {discountValidUntil}.</p> : null}
          {discountPrize?.actionHref ? (
            <a className="btn-profile-open" href={discountPrize.actionHref} target="_blank" rel="noreferrer">
              {discountPrize.actionLabel || 'Применить скидку'}
            </a>
          ) : null}
        </article>
        <article>
          <span className="profile-awards-card-icon">🏆</span>
          <h2>Кубок и медаль финалиста</h2>
          <p>
            Ваш результат сохранен в списке финалистов по марафону: {languageLabel}. Откройте
            персональную ссылку, чтобы увидеть себя самым первым среди финалистов, со своими
            медалями и фотографией из профиля.
          </p>
          <p className="profile-awards-profile-link">
            Ссылка на ваш профиль финалиста: <span>{finalistProfileUrl}</span>
          </p>
          <div className="profile-awards-card-actions">
            <Link className="btn-profile-open" to={finalistProfilePath}>
              Посмотреть меня среди финалистов
            </Link>
            <button type="button" className="btn-profile-login" onClick={copyFinalistProfileLink}>
              Скопировать ссылку
            </button>
          </div>
          {winnerLinkStatus ? <p className="profile-awards-link-status">{winnerLinkStatus}</p> : null}
        </article>
      </section>

      <section className="profile-awards-next">
        <h2>Что дальше?</h2>
        <p>{awardCopy.nextStep}</p>
        <div className="profile-payment-actions">
          <Link className="btn-profile-open" to="/register">Выбрать следующий марафон</Link>
          <a className="btn-profile-open" href={basicCourseUrl} target="_blank" rel="noreferrer">Записаться на курс</a>
        </div>
      </section>
    </main>
  );
}
