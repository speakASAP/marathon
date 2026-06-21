import { useEffect } from 'react';
import CertificateShowcase from '../components/CertificateShowcase';

/**
 * Awards / certificates page. Content from legacy awards_view.html.
 */
export default function Awards() {
  useEffect(() => {
    document.title = 'Награды и сертификаты — Марафон';
  }, []);

  return (
    <div className="container page-static">
      <h1>Награды и сертификаты</h1>
      <div className="static-content">
        <p>По завершении марафона финалисты получают награды и сертификаты SpeakASAP®.</p>
        <p>Сертификат подтверждает прохождение языкового марафона и достигнутый уровень.</p>
        <CertificateShowcase
          id="awards-certificate"
          title="Пример сертификата финалиста"
          lead="Финалист видит статус «Сертификат» и получает одну из трех медальных версий: золотую, серебряную или бронзовую."
          compact
        />
        <p>Подробности о призах и условиях получения — в разделе марафона и в письмах от организаторов.</p>
      </div>
    </div>
  );
}
