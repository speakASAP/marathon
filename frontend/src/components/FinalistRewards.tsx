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
    prize: 'золотая медаль',
    diploma: 'Золотой диплом финалиста',
    summary: 'Марафон завершен без потери темпа. Сертификат и призы готовы.',
    initial: 'G',
  },
  silver: {
    title: 'Серебряный финалист',
    prize: 'серебряная медаль',
    diploma: 'Серебряный диплом финалиста',
    summary: 'Марафон завершен с сильным результатом. Сертификат и призы готовы.',
    initial: 'S',
  },
  bronze: {
    title: 'Бронзовый финалист',
    prize: 'бронзовая медаль',
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

function certificateImage(medal: FinalistMedalKind | null) {
  return `/img/certificates/${medal || "gold"}_en.png?v=20260630-clean-template`;
}

function formatCertificateLanguage(certificate: FinalistCertificate | null, marathonTitle: string) {
  const language = certificate?.languageLabel?.trim();
  return language ? `${language} языку` : marathonTitle;
}

function createShareLinks(shareUrl: string | null | undefined, shareText: string): FinalistShareLink[] {
  if (!shareUrl) return [];
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  return [
    {
      id: 'telegram',
      label: '✈',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'vk',
      label: 'vk',
      href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`,
    },
    {
      id: 'whatsapp',
      label: '☘',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      id: 'link',
      label: '🔗',
      href: shareUrl,
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
  const certificateLanguage = formatCertificateLanguage(certificate, marathonTitle);
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
      <div className="finalist-rewards__main">
        <div className="finalist-rewards__medal-stage" aria-hidden="true">
          <span className="finalist-rewards__ribbon" />
          <span className="finalist-rewards__laurel finalist-rewards__laurel--left" />
          <span className="finalist-rewards__laurel finalist-rewards__laurel--right" />
          <span className="finalist-rewards__confetti finalist-rewards__confetti--one" />
          <span className="finalist-rewards__confetti finalist-rewards__confetti--two" />
          <span className="finalist-rewards__medal-disc">
            <span className="finalist-rewards__medal-stars">★ ★ ★</span>
            <span className="finalist-rewards__medal-cup">🏆</span>
          </span>
        </div>

        <div className="finalist-rewards__summary">
          <h1><span aria-hidden="true">🎉</span> Марафон завершен</h1>
          <h2>✨ {medalCopy.title} ✨</h2>
          <p className="finalist-rewards__prize-line">🥇 Ваш приз: {medalCopy.prize.toLowerCase()}</p>
          <p className="finalist-rewards__summary-text">{certificateSubtitle}</p>
          <div className="finalist-rewards__actions">
            {certificate?.downloadPdfUrl ? (
              <a className="btn-profile-open finalist-rewards__primary-action" href={certificate.downloadPdfUrl} target="_blank" rel="noreferrer">
                <span aria-hidden="true">↓</span> Скачать PDF
              </a>
            ) : (
              <button type="button" className="btn-profile-open finalist-rewards__primary-action" onClick={onDownloadPdf} disabled={!canDownloadPdf}>
                <span aria-hidden="true">↓</span> Скачать PDF
              </button>
            )}
            <button type="button" className="btn-profile-login finalist-rewards__secondary-action" onClick={handleShare} disabled={!shareUrl && !onShare}>
              <span aria-hidden="true">⌯</span> Поделиться
            </button>
          </div>
          {shareLinks.length > 0 ? (
            <div className="finalist-rewards__socials" aria-label="Поделиться в соцсетях">
              <span>Поделиться в соцсетях</span>
              <div className="finalist-rewards__social-links">
                {shareLinks.map((link) => (
                  <a key={link.id} className={`finalist-rewards__social finalist-rewards__social--${link.id}`} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <article className="finalist-rewards__certificate" aria-label={certificateTitle}>
          <div className="finalist-rewards__paper">
            <img src={certificateImage(medal)} alt={certificateTitle} width="936" height="1320" />
            <span className="finalist-rewards__certificate-name">{participantName}</span>
            <span className="finalist-rewards__certificate-language">{certificateLanguage}</span>
            {finishedDate ? <span className="finalist-rewards__certificate-date">{finishedDate}</span> : null}
          </div>
          {certificate?.verificationUrl ? (
            <a className="finalist-rewards__verify" href={certificate.verificationUrl} target="_blank" rel="noreferrer">
              Проверить сертификат
            </a>
          ) : null}
        </article>
      </div>

      <div className="finalist-rewards__prize-strip" aria-label="Ваши призы за успех">
        <h3><span aria-hidden="true">🎁</span> Ваши призы за успех</h3>
        <ul>
          {prizes.map((prize) => (
            <li key={prize.id}>
              <span className="finalist-rewards__prize-badge" aria-hidden="true">{prize.badge || '★'}</span>
              <span>
                <strong>{prize.title}</strong>
                <small>{prize.description}</small>
                {prize.actionHref && prize.actionLabel ? (
                  <a href={prize.actionHref} target="_blank" rel="noreferrer">{prize.actionLabel}</a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
