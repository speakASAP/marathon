export type MedalKind = 'gold' | 'silver' | 'bronze';

export type CertificateRenderInput = {
  participantName: string;
  languageDative: string;
  finishedDate: string;
  siteUrl?: string;
  signature?: string;
};

const CERTIFICATE_TEXT_COLOR = '#806427';

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

  fitCanvasText(context, input.participantName, canvas.width * 0.72, size(55), '900');
  context.lineWidth = Math.max(1, size(2));
  context.strokeText(input.participantName, x(468), y(850), canvas.width * 0.72);
  context.fillText(input.participantName, x(468), y(850), canvas.width * 0.72);

  context.lineWidth = 0;
  context.font = `700 ${size(35)}px Georgia, "Times New Roman", serif`;
  context.fillText('За успешный забег по', x(468), y(920), canvas.width * 0.7);
  context.fillText(`${input.languageDative} языку`, x(468), y(965), canvas.width * 0.7);

  context.font = `700 ${size(30)}px Georgia, "Times New Roman", serif`;
  context.fillText(input.finishedDate, x(468), y(1052), canvas.width * 0.4);

  context.font = `italic ${size(27)}px Georgia, "Times New Roman", serif`;
  context.textAlign = 'left';
  context.fillText(input.signature || 'Елена Шипилова', x(165), y(1030), canvas.width * 0.24);

  context.textAlign = 'center';
  context.font = `italic ${size(34)}px Georgia, "Times New Roman", serif`;
  context.fillText(input.siteUrl || 'speakasap.com', x(468), y(1168), canvas.width * 0.56);

  context.restore();
}
