export type FinalistMedalKind = 'gold' | 'silver' | 'bronze';

export type FinalistParticipant = {
  name: string;
  displayName?: string | null;
};

export type FinalistCertificate = {
  title?: string;
  subtitle?: string;
  downloadPdfUrl?: string | null;
  verificationUrl?: string | null;
  languageLabel?: string | null;
};

export type FinalistPrize = {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  badge?: string;
};

export type FinalistShareLink = {
  id: string;
  label: string;
  href: string;
};

export type FinalistRewardsProps = {
  participant: FinalistParticipant;
  certificate?: FinalistCertificate | null;
  prizes?: FinalistPrize[];
  medal: FinalistMedalKind | null;
  marathonTitle: string;
  finishedAt: string | Date | null;
  shareUrl?: string | null;
  shareText?: string;
  className?: string;
  onDownloadPdf?: () => void;
  onShare?: () => void;
};

type MedalCopy = {
  title: string;
  prize: string;
  diploma: string;
  summary: string;
  initial: string;
};

const MEDAL_COPY: Record<FinalistMedalKind, MedalCopy> = {
  gold: {
    title: 'Золотой финалист',
    prize: 'Золотая медаль',
    diploma: 'Золотой диплом финалиста',
    summary: 'Марафон завершен без потери темпа. Сертификат и призы готовы.',
    initial: 'G',
  },
  silver: {
    title: 'Серебряный финалист',
    prize: 'Серебряная медаль',
    diploma: 'Серебряный диплом финалиста',
    summary: 'Марафон завершен с сильным результатом. Сертификат и призы готовы.',
    initial: 'S',
  },
  bronze: {
    title: 'Бронзовый финалист',
    prize: 'Бронзовая медаль',
    diploma: 'Бронзовый диплом финалиста',
    summary: 'Финиш зафиксирован. Сертификат и призы готовы в профиле.',
    initial: 'B',
  },
};

const FALLBACK_MEDAL_COPY: MedalCopy = {
  title: 'Финалист марафона',
  prize: 'Медаль финалиста',
  diploma: 'Диплом финалиста',
  summary: 'Финиш зафиксирован. Сертификат и призы готовы в профиле.',
  initial: 'F',
};

const DEFAULT_PRIZES: FinalistPrize[] = [
  {
    id: 'certificate',
    title: 'Именной сертификат',
    description: 'Диплом финалиста с именем, марафоном, датой финиша и медальным статусом.',
    badge: 'PDF',
  },
  {
    id: 'discount',
    title: 'Скидка на следующий курс',
    description: 'Персональная скидка открывается после проверки финального результата.',
    badge: '%',
  },
  {
    id: 'community',
    title: 'Публичный результат',
    description: 'Медаль можно показать друзьям и сохранить как подтверждение завершения марафона.',
    badge: '🏆',
  },
];

function formatDate(value: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeName(participant: FinalistParticipant) {
  return participant.displayName?.trim() || participant.name.trim() || 'Финалист SpeakASAP';
}

function createShareLinks(shareUrl: string | null | undefined, shareText: string): FinalistShareLink[] {
  if (!shareUrl) return [];
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  return [
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'vk',
      label: 'VK',
      href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedText}&body=${encodedText}%0A${encodedUrl}`,
    },
  ];
}

export default function FinalistRewards({
  participant,
  certificate = null,
  prizes = DEFAULT_PRIZES,
  medal,
  marathonTitle,
  finishedAt,
  shareUrl = null,
  shareText,
  className = '',
  onDownloadPdf,
  onShare,
}: FinalistRewardsProps) {
  const medalCopy = medal ? MEDAL_COPY[medal] : FALLBACK_MEDAL_COPY;
  const participantName = normalizeName(participant);
  const finishedDate = formatDate(finishedAt);
  const certificateTitle = certificate?.title?.trim() || medalCopy.diploma;
  const certificateSubtitle = certificate?.subtitle?.trim() || medalCopy.summary;
  const languageLabel = certificate?.languageLabel?.trim() || 'языковому марафону';
  const resolvedShareText = shareText?.trim() || `${participantName} завершил(а) ${marathonTitle} и получил(а) ${medalCopy.prize}.`;
  const shareLinks = createShareLinks(shareUrl, resolvedShareText);
  const canDownloadPdf = Boolean(certificate?.downloadPdfUrl || onDownloadPdf);

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    if (shareUrl && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: certificateTitle,
        text: resolvedShareText,
        url: shareUrl,
      });
    }
  };

  return (
    <section className={`finalist-rewards finalist-rewards--${medal || 'finalist'}${className ? ` ${className}` : ''}`}>
      <div className="finalist-rewards__hero">
        <div className="finalist-rewards__summary">
          <p className="finalist-rewards__eyebrow">Финальный результат</p>
          <h2>{medalCopy.title}</h2>
          <p>{certificateSubtitle}</p>
          <div className="finalist-rewards__actions">
            {certificate?.downloadPdfUrl ? (
              <a className="btn-profile-open" href={certificate.downloadPdfUrl} target="_blank" rel="noreferrer">
                Скачать PDF
              </a>
            ) : (
              <button type="button" className="btn-profile-open" onClick={onDownloadPdf} disabled={!canDownloadPdf}>
                Скачать PDF
              </button>
            )}
            <button type="button" className="btn-profile-login" onClick={handleShare} disabled={!shareUrl && !onShare}>
              Поделиться
            </button>
          </div>
        </div>

        <div className="finalist-rewards__award" aria-label={medalCopy.prize}>
          <div className="finalist-rewards__trophy" aria-hidden="true">
            <span className="finalist-rewards__trophy-cup" />
            <span className="finalist-rewards__trophy-stem" />
            <span className="finalist-rewards__trophy-base" />
          </div>
          <span className={`medal-badge medal-badge--${medal || 'gold'}`}>
            <span className="medal-badge__medal" aria-hidden="true">
              <span className="medal-badge__ribbon" />
              <span className="medal-badge__coin">{medalCopy.initial}</span>
            </span>
            <span className="medal-badge__label">{medalCopy.prize}</span>
          </span>
        </div>
      </div>

      <div className="finalist-rewards__body">
        <article className="finalist-rewards__certificate" aria-label={certificateTitle}>
          <div className="finalist-rewards__paper">
            <span className="finalist-rewards__seal" aria-hidden="true">{medalCopy.initial}</span>
            <p className="finalist-rewards__certificate-kicker">SpeakASAP Marathon</p>
            <h3>{certificateTitle}</h3>
            <p className="finalist-rewards__certificate-name">{participantName}</p>
            <p className="finalist-rewards__certificate-text">
              За успешное завершение марафона «{marathonTitle}» по {languageLabel}
            </p>
            {finishedDate ? <p className="finalist-rewards__certificate-date">{finishedDate}</p> : null}
            {certificate?.verificationUrl ? (
              <a className="finalist-rewards__verify" href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                Проверить сертификат
              </a>
            ) : null}
          </div>
        </article>

        <div className="finalist-rewards__side">
          <section className="finalist-rewards__prizes" aria-label="Призы и скидки финалиста">
