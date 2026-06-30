type CertificatePreview = {
  medal: 'gold' | 'silver' | 'bronze';
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  mockName: string;
  mockLanguage: string;
  mockDate: string;
};

const certificatePreviews: CertificatePreview[] = [
  {
    medal: 'gold',
    title: 'Золотой сертификат',
    subtitle: 'Все задания выполнены вовремя',
    image: '/img/certificates/gold_en.png',
    alt: 'Пример золотого сертификата финалиста языкового марафона SpeakASAP',
    mockName: 'Елена Прекрасная',
    mockLanguage: 'немецкому языку',
    mockDate: '29.06.2026',
  },
  {
    medal: 'silver',
    title: 'Серебряный сертификат',
    subtitle: 'Марафон завершен с опозданием на 1 день',
    image: '/img/certificates/silver_en.png',
    alt: 'Пример серебряного сертификата финалиста языкового марафона SpeakASAP',
    mockName: 'Анна Быстрая',
    mockLanguage: 'испанскому языку',
    mockDate: '30.06.2026',
  },
  {
    medal: 'bronze',
    title: 'Бронзовый сертификат',
    subtitle: 'Марафон завершен с использованием до 7 дополнительных дней',
    image: '/img/certificates/bronze_en.png',
    alt: 'Пример бронзового сертификата финалиста языкового марафона SpeakASAP',
    mockName: 'Мария Смелая',
    mockLanguage: 'французскому языку',
    mockDate: '01.07.2026',
  },
];

type CertificateShowcaseProps = {
  id?: string;
  className?: string;
  title?: string;
  lead?: string;
  compact?: boolean;
  showStatus?: boolean;
  showMockDetails?: boolean;
};

export default function CertificateShowcase({
  id,
  className = '',
  title = 'Сертификат финалиста',
  lead = 'В конце марафона финалист получает именной сертификат SpeakASAP. Вид сертификата зависит от результата прохождения.',
  compact = false,
  showStatus = true,
  showMockDetails = false,
}: CertificateShowcaseProps) {
  return (
    <section
      id={id}
      className={`certificate-showcase${compact ? ' certificate-showcase--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="certificate-showcase__head">
        {showStatus ? <span className="certificate-showcase__status">Статус: Сертификат</span> : null}
        <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
        <p>{lead}</p>
      </div>

      <div className="certificate-showcase__gallery" aria-label="Примеры сертификатов финалиста">
        {certificatePreviews.map((certificate) => (
          <article key={certificate.medal} className={`certificate-card certificate-card--${certificate.medal}`}>
            <div className="certificate-card__image-wrap">
              <div className="certificate-card__certificate-frame">
                <img src={certificate.image} alt={certificate.alt} loading="lazy" width="936" height="1320" />
                {showMockDetails ? (
                  <div className="certificate-card__mock-fields" aria-hidden="true">
                    <span className="certificate-card__mock-name">{certificate.mockName}</span>
                    <span className="certificate-card__mock-line certificate-card__mock-line-one">За успешный забег по</span>
                    <span className="certificate-card__mock-line certificate-card__mock-line-two">{certificate.mockLanguage}</span>
                    <span className="certificate-card__mock-signature">Елена Шипилова</span>
                    <span className="certificate-card__mock-date">{certificate.mockDate}</span>
                    <span className="certificate-card__mock-site">speakasap.com</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="certificate-card__body">
              <span>Пример</span>
              <h3>{certificate.title}</h3>
              <p>{certificate.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
