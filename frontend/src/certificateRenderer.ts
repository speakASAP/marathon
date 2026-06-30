export type MedalKind = 'gold' | 'silver' | 'bronze';

export type CertificateRenderInput = {
  participantName: string;
  languageDative: string;
  finishedDate: string;
};

const CERTIFICATE_TEXT_COLOR = '#806427';
const CERTIFICATE_SIGNATURE = 'Елена Шипилова';
const CERTIFICATE_SITE_URL = 'speakasap.com';

function fitCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  fontWeight: string,
  fontFamily = 'Georgia, "Times New Roman", serif',
) {
  let size = initialSize;
  do {
    context.font = `${fontWeight} ${size}px ${fontFamily}`;
    if (context.measureText(text).width <= maxWidth || size <= 18) break;
    size -= 2;
  } while (size > 18);
}

export function drawCertificateFields(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  input: CertificateRenderInput,
) {
  const scaleX = canvas.width / 936;
  const scaleY = canvas.height / 1320;
  const x = (value: number) => Math.round(value * scaleX);
  const y = (value: number) => Math.round(value * scaleY);
  const size = (value: number) => Math.round(value * Math.min(scaleX, scaleY));

  context.save();
  context.fillStyle = CERTIFICATE_TEXT_COLOR;
  context.strokeStyle = 'rgba(248, 242, 220, 0.68)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';

  fitCanvasText(context, input.participantName, canvas.width * 0.68, size(44), '900');
  context.lineWidth = Math.max(1, size(2));
  context.strokeText(input.participantName, x(468), y(835), canvas.width * 0.68);
  context.fillText(input.participantName, x(468), y(835), canvas.width * 0.68);

  context.lineWidth = 0;
  context.font = `700 ${size(30)}px Georgia, "Times New Roman", serif`;
  context.fillText('За успешный забег по', x(468), y(910), canvas.width * 0.66);
  context.fillText(`${input.languageDative} языку`, x(468), y(952), canvas.width * 0.66);

  context.font = `700 ${size(27)}px Georgia, "Times New Roman", serif`;
  context.fillText(input.finishedDate, x(665), y(1028), canvas.width * 0.22);

  context.font = `italic ${size(24)}px Georgia, "Times New Roman", serif`;
  context.textAlign = 'left';
  context.fillText(CERTIFICATE_SIGNATURE, x(165), y(1032), canvas.width * 0.24);

  context.textAlign = 'center';
  context.font = `italic ${size(30)}px Georgia, "Times New Roman", serif`;
  context.fillText(CERTIFICATE_SITE_URL, x(468), y(1138), canvas.width * 0.5);

  context.restore();
}
