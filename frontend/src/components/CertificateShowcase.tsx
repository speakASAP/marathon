type CertificatePreview = {
  medal: 'gold' | 'silver' | 'bronze';
  title: string;
  subtitle: string;
  image: string;
  alt: string;
};

const certificatePreviews: CertificatePreview[] = [
  {
    medal: 'gold',
    title: 'Золотой сертификат',
    subtitle: 'Все задания выполнены вовремя',
    image: '/img/certificates/examples/gold_demo.png',
    alt: 'Пример золотого сертификата финалиста языкового марафона SpeakASAP',
  },
  {
    medal: 'silver',
    title: 'Серебряный сертификат',
    subtitle: 'Марафон завершен с опозданием на 1 день',
    image: '/img/certificates/examples/silver_demo.png',
    alt: 'Пример серебряного сертификата финалиста языкового марафона SpeakASAP',
  },
  {
    medal: 'bronze',
    title: 'Бронзовый сертификат',
    subtitle: 'Марафон завершен с использованием до 7 дополнительных дней',
    image: '/img/certificates/examples/bronze_demo.png',
    alt: 'Пример бронзового сертификата финалиста языкового марафона SpeakASAP',
  },
];

type CertificateShowcaseProps = {
  id?: string;
  className?: string;
  title?: string;
  lead?: string;
  compact?: boolean;
  showStatus?: boolean;
};

export default function CertificateShowcase({
  id,
  className = '',
  title = 'Сертификат финалиста',
  lead = 'В конце марафона финалист получает именной сертификат SpeakASAP. Вид сертификата зависит от результата прохождения.',
  compact = false,
  showStatus = true,
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
        <div className="certificate-stack" aria-label="Стопка из золотого, серебряного и бронзового сертификатов">
          {certificatePreviews.map((certificate) => (
            <figure key={certificate.medal} className={`certificate-stack__item certificate-stack__item--${certificate.medal}`}>
              <img src={certificate.image} alt={certificate.alt} loading="lazy" width="936" height="1320" />
            </figure>
          ))}
        </div>

        <div className="certificate-showcase__medals" aria-label="Варианты сертификата">
          {certificatePreviews.map((certificate) => (
            <article key={certificate.medal} className={`certificate-medal-summary certificate-medal-summary--${certificate.medal}`}>
              <h3>{certificate.title}</h3>
              <p>{certificate.subtitle}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
