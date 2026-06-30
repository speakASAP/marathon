import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getLoginUrl, getPasswordResetUrl, redirectToLogin } from "../auth";
import {
  MarathonAuthRequiredError,
  MarathonNotFoundError,
  confirmCertificateName,
  createPaymentCheckout,
  fetchMyMarathon,
  fetchMyProfile,
  reconcilePaymentStatus,
  saveNpsSurvey,
  type Answer,
  type PaymentMethod,
  type MyMarathon,
  type MarathonUserProfileSettings,
} from "../api/profileMarathon";
import { stripHeadingTerminalPeriod } from "../components/assignment/assignmentBlockNormalization";
import FinalistRewards from "../components/FinalistRewards";
import { drawCertificateFields } from "../certificateRenderer";
import { buildSpeakAsapBasicCourseUrl } from "../languages";

type PaymentReturnState = "success" | "cancelled" | null;
type MedalKind = "gold" | "silver" | "bronze";
type CertificateDownloadFormat = "png" | "jpeg" | "pdf";
type ShareStatusKind = "success" | "fallback" | "error";

const MEDAL_LABELS: Record<
  MedalKind,
  { title: string; prize: string; detail: string }
> = {
  gold: {
    title: "Золотой финалист",
    prize: "Ваш приз: золотая медаль",
    detail: "Марафон завершен без потери штрафного круга и бонусных дней.",
  },
  silver: {
    title: "Серебряный финалист",
    prize: "Ваш приз: серебряная медаль",
    detail: "Марафон завершен с сохраненными бонусными днями.",
  },
  bronze: {
    title: "Бронзовый финалист",
    prize: "Ваш приз: бронзовая медаль",
    detail: "Марафон завершен. Приз зафиксирован в вашем профиле.",
  },
};

const CERTIFICATE_DOWNLOAD_FORMATS: Array<{
  format: CertificateDownloadFormat;
  label: string;
}> = [
  { format: "png", label: "PNG" },
  { format: "pdf", label: "PDF" },
  { format: "jpeg", label: "JPEG" },
];

const BOOK_PRIZE_URL =
  "https://speakasap.com/media/steps/german/tochka_vixoda_iz_yazika_ili_kak_brosit_ychit_yazik_buch.pdf";
const SHARE_FALLBACK_DELAY_MS = 3600;

const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  detail: string;
  disabled?: boolean;
}> = [
  {
    value: "paypal",
    label: "Оплата через аккаунт PayPal",
    detail: "Оплата через аккаунт PayPal.",
  },
  {
    value: "card",
    label: "Оплата банковской картой",
    detail:
      "Visa, Mastercard или другая банковская карта через защищенный Stripe Checkout.",
  },
  {
    value: "fiobanka",
    label: "Банковский перевод",
    detail:
      "Откроется QR для оплаты из банковского приложения в Чехии. Работает только для оплаты по Чехии.",
  },
];

const AWARD_LANGUAGE_COPY: Record<
  string,
  { dative: string; hashtag: string; nextStep: string }
> = {
  en: {
    dative: "английскому",
    hashtag: "#english_speakASAP",
    nextStep: "Скидка на следующий английский курс SpeakASAP",
  },
  de: {
    dative: "немецкому",
    hashtag: "#german_speakASAP",
    nextStep: "Скидка на следующий немецкий курс SpeakASAP",
  },
  es: {
    dative: "испанскому",
    hashtag: "#spanish_speakASAP",
    nextStep: "Скидка на следующий испанский курс SpeakASAP",
  },
  fr: {
    dative: "французскому",
    hashtag: "#french_speakASAP",
    nextStep: "Скидка на следующий французский курс SpeakASAP",
  },
  it: {
    dative: "итальянскому",
    hashtag: "#italian_speakASAP",
    nextStep: "Скидка на следующий итальянский курс SpeakASAP",
  },
  cz: {
    dative: "чешскому",
    hashtag: "#czech_speakASAP",
    nextStep: "Скидка на следующий чешский курс SpeakASAP",
  },
  tr: {
    dative: "турецкому",
    hashtag: "#turkish_speakASAP",
    nextStep: "Скидка на следующий турецкий курс SpeakASAP",
  },
  pt: {
    dative: "португальскому",
    hashtag: "#portuguese_speakASAP",
    nextStep: "Скидка на следующий португальский курс SpeakASAP",
  },
  nl: {
    dative: "нидерландскому",
    hashtag: "#dutch_speakASAP",
    nextStep: "Скидка на следующий нидерландский курс SpeakASAP",
  },
  pl: {
    dative: "польскому",
    hashtag: "#polish_speakASAP",
    nextStep: "Скидка на следующий польский курс SpeakASAP",
  },
  no: {
    dative: "норвежскому",
    hashtag: "#norwegian_speakASAP",
    nextStep: "Скидка на следующий норвежский курс SpeakASAP",
  },
  se: {
    dative: "шведскому",
    hashtag: "#swedish_speakASAP",
    nextStep: "Скидка на следующий шведский курс SpeakASAP",
  },
  dk: {
    dative: "датскому",
    hashtag: "#danish_speakASAP",
    nextStep: "Скидка на следующий датский курс SpeakASAP",
  },
};

const AWARD_LANGUAGE_ALIASES: Record<string, string> = {
  cs: "cz",
  nb: "no",
  nn: "no",
  sv: "se",
  da: "dk",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCertificateDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function certificateImage(medal: MedalKind) {
  return `/img/certificates/${medal}_en.png?v=20260630-seal`;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error("Сертификат не удалось подготовить для скачивания."),
          );
        }
      },
      type,
      quality,
    );
  });
}

function buildCertificateFilename(data: MyMarathon, extension: string) {
  return `speakASAP_Marathon_${data.languageCode}_${data.medal}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfBlobFromCanvas(canvas: HTMLCanvasElement) {
  const encoder = new TextEncoder();
  const jpegBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94));
  const pageWidth = canvas.width;
  const pageHeight = canvas.height;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/CertificateImage Do\nQ\n`;
  const chunks: BlobPart[] = [];
  const offsets: number[] = [];
  let byteLength = 0;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );
    byteLength += bytes.length;
  };
  const appendObject = (
    id: number,
    body: string | Uint8Array,
    suffix = "\nendobj\n",
  ) => {
    offsets[id] = byteLength;
    append(`${id} 0 obj\n`);
    append(body);
    append(suffix);
  };

  append("%PDF-1.4\n");
  appendObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  appendObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  appendObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /CertificateImage 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = byteLength;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  append(jpegBytes);
  append("\nendstream\nendobj\n");
  appendObject(
    5,
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`,
  );

  const xrefOffset = byteLength;
  append("xref\n0 6\n0000000000 65535 f\n");
  for (let id = 1; id <= 5; id += 1) {
    append(`${String(offsets[id]).padStart(10, "0")} 00000 n\n`);
  }
  append(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(chunks, { type: "application/pdf" });
}

function resolveParticipantName(profile: MarathonUserProfileSettings | null) {
  return (
    profile?.displayName?.trim() ||
    profile?.email?.trim() ||
    "Финалист SpeakASAP"
  );
}

function resolveAwardLanguageCopy(code: string) {
  const normalized = code.toLowerCase();
  return (
    AWARD_LANGUAGE_COPY[AWARD_LANGUAGE_ALIASES[normalized] || normalized] || {
      dative: "выбранному",
      hashtag: "#speakASAP_marathon",
      nextStep: "Скидка на следующий курс SpeakASAP",
    }
  );
}

function getStateLabel(answer: Answer) {
  if (answer.block_reason === "payment_required") return "Оплата";
  if (answer.is_late) return "Поздно";
  if (answer.state === "completed" || answer.state === "done") return "Готово";
  if (answer.state === "checked") return "Проверено";
  if (answer.state === "active") return "Активно";
  return "Закрыто";
}

function getStepMeta(answer: Answer) {
  if (answer.block_reason === "payment_required") {
    return "Для открытия задания нужна оплата марафона.";
  }
  if (answer.state === "inactive") {
    if (answer.is_scheduled_future) {
      return `По расписанию: ${formatDateTime(answer.start)}. Можно открыть заранее.`;
    }
    return "Откроется после выполнения предыдущего задания. Можно открыть заранее.";
  }
  if (answer.state === "completed" || answer.state === "done") {
    return `Сохранено ${formatDateTime(answer.stop)}.`;
  }
  return `${answer.is_late ? "Поздно. " : ""}Срок: ${formatDateTime(answer.stop)}.`;
}

function getStepStatusText(answer: Answer) {
  const label = getStateLabel(answer);
  const meta = getStepMeta(answer);
  return label === "Поздно" && meta.startsWith("Поздно.")
    ? meta
    : `${label} · ${meta}`;
}

/**
 * My marathon detail: GET /api/v1/me/marathons/:marathonerId (Bearer).
 * Shows current step, progress, link to step page.
 */
export default function ProfileDetail() {
  const { marathonerId } = useParams<{ marathonerId: string }>();
  const [data, setData] = useState<MyMarathon | null>(null);
  const [profile, setProfile] = useState<MarathonUserProfileSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal");
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  const [paymentStatusError, setPaymentStatusError] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [npsSaving, setNpsSaving] = useState(false);
  const [npsMessage, setNpsMessage] = useState("");
  const [npsError, setNpsError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [shareStatus, setShareStatus] = useState<{
    kind: ShareStatusKind;
    message: string;
  } | null>(null);
  const [downloadingFormat, setDownloadingFormat] =
    useState<CertificateDownloadFormat | null>(null);
  const [sharingCertificate, setSharingCertificate] = useState(false);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState("");
  const [winnerLinkStatus, setWinnerLinkStatus] = useState("");
  const [certificateNameDraft, setCertificateNameDraft] = useState("");
  const [certificateNameEditing, setCertificateNameEditing] = useState(false);
  const [certificateNameSaving, setCertificateNameSaving] = useState(false);
  const [certificateNameError, setCertificateNameError] = useState("");

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "success") setPaymentReturn("success");
    if (payment === "cancelled" || payment === "cancel")
      setPaymentReturn("cancelled");
  }, []);

  useEffect(() => {
    if (!marathonerId) return;
    setLoading(true);
    setUnauth(false);
    setNotFound(false);
    setLoadError("");
    Promise.all([fetchMyMarathon(marathonerId), fetchMyProfile()])
      .then(([marathonData, profileData]) => {
        setData(marathonData);
        setProfile(profileData);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setUnauth(true);
        } else if (error instanceof MarathonNotFoundError) {
          setNotFound(true);
        } else {
          setLoadError(
            "Профиль марафона не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.",
          );
        }
        setLoading(false);
      });
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `${data.title} — Марафон`;
    if (data?.nps_survey) {
      setNpsScore(data.nps_survey.score);
      setNpsComment(data.nps_survey.comment || "");
    } else if (data) {
      setNpsScore(null);
      setNpsComment("");
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const suggestedName =
      data.certificate_name_confirmation.confirmedName ||
      data.certificate_name_confirmation.currentName ||
      resolveParticipantName(profile);
    setCertificateNameDraft(suggestedName);
    setCertificateNameEditing(false);
    setCertificateNameError("");
  }, [
    data?.id,
    data?.certificate_name_confirmation.confirmedName,
    data?.certificate_name_confirmation.currentName,
    profile?.displayName,
    profile?.email,
  ]);

  useEffect(() => {
    let cancelled = false;
    setCertificatePreviewUrl("");

    if (!data?.medal || !data.finished_at) return undefined;

    const certificateNameConfirmation = data.certificate_name_confirmation;
    const certificateNameConfirmed =
      !certificateNameConfirmation.required || certificateNameConfirmation.confirmed;
    if (!certificateNameConfirmed) return undefined;

    const finishedDate = formatCertificateDate(data.finished_at);
    const certificateLanguage = resolveAwardLanguageCopy(data.languageCode).dative;
    const participantName =
      data.certificate?.participantName || resolveParticipantName(profile);

    loadImage(certificateImage(data.medal))
      .then((image) => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || 620;
        canvas.height = image.naturalHeight || 877;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is not available");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        drawCertificateFields(context, canvas, {
          participantName,
          languageDative: certificateLanguage,
          finishedDate,
        });

        if (!cancelled) setCertificatePreviewUrl(canvas.toDataURL("image/png"));
      })
      .catch(() => {
        if (!cancelled) setCertificatePreviewUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [
    data?.medal,
    data?.finished_at,
    data?.certificate?.participantName,
    data?.certificate_name_confirmation.required,
    data?.certificate_name_confirmation.confirmed,
    data?.languageCode,
    profile?.displayName,
    profile?.email,
  ]);

  useEffect(() => {
    if (paymentReturn !== "success" || !data?.payment_required)
      return undefined;

    let stopped = false;
    let timer: number | undefined;

    const refreshPaymentStatus = async () => {
      try {
        await reconcilePaymentStatus(data.id);
        const nextData = await fetchMyMarathon(data.id);
        if (stopped) return;
        setData(nextData);
        if (!nextData.payment_required) {
          setCheckoutError("");
          setPaymentStatusError("");
          return;
        }
        timer = window.setTimeout(refreshPaymentStatus, 3_000);
      } catch (error) {
        if (stopped) return;
        if (error instanceof MarathonAuthRequiredError) {
          redirectToLogin(`/profile/${data.id}`);
          return;
        }
        setPaymentStatusError(
          "Не удалось обновить статус оплаты. Мы продолжим проверку автоматически.",
        );
        timer = window.setTimeout(refreshPaymentStatus, 6_000);
      }
    };

    refreshPaymentStatus();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentReturn, data?.id, data?.payment_required]);

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="container page-static">
        <h1>Войдите в профиль марафона</h1>
        <section className="profile-empty-panel" role="alert">
          <p>
            Этот профиль уже должен быть привязан к единому аккаунту Alfares.
            Войдите через центральный вход, затем мы вернем вас на эту страницу.
          </p>
          <div className="profile-payment-actions">
            <a
              className="btn-profile-open"
              href={getLoginUrl(`/profile/${marathonerId}`)}
            >
              Войти с email или телефоном
            </a>
            <a className="btn-profile-login" href={getPasswordResetUrl()}>
              Восстановить пароль
            </a>
            <Link to="/faq" className="btn-profile-login">
              Связаться с поддержкой
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <h1>Профиль марафона временно недоступен</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-payment-actions">
            <button
              type="button"
              className="btn-profile-open"
              onClick={() => window.location.reload()}
            >
              Обновить
            </button>
            <Link to="/faq" className="btn-profile-login">
              Связаться с поддержкой
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container">
        <p>Марафон не найден.</p>
        <Link to="/profile">← Мои марафоны</Link>
      </div>
    );
  }

  const current = data.current_step;
  const isFinished = Boolean(data.finished_at);
  const completedCount = data.answers.filter(
    (answer) =>
      answer.state === "done" ||
      answer.state === "completed" ||
      answer.state === "checked",
  ).length;
  const progressPct = data.answers.length
    ? Math.round((completedCount / data.answers.length) * 100)
    : 0;
  const showBonusDays = data.bonus_total > 0;
  const medal = data.medal ? MEDAL_LABELS[data.medal] : null;
  const participantName = resolveParticipantName(profile);
  const awardCopy = resolveAwardLanguageCopy(data.languageCode);
  const basicCourseUrl = buildSpeakAsapBasicCourseUrl(data.languageCode);
  const profilePath = `/profile/${encodeURIComponent(data.id)}`;
  const shareUrl =
    typeof window === "undefined"
      ? profilePath
      : `${window.location.origin}${profilePath}`;
  const shareText = `Я завершил(а) языковой марафон SpeakASAP: ${stripHeadingTerminalPeriod(data.title)}. ${medal?.prize || "Мой сертификат готов"}! ${awardCopy.hashtag}`;
  const certificateNameConfirmation = data.certificate_name_confirmation;
  const certificateNameConfirmed =
    !certificateNameConfirmation.required ||
    certificateNameConfirmation.confirmed;
  const finalistPrizes = data.prizes.length
    ? data.prizes.map((prize) => ({
        id: prize.id,
        title: prize.title,
        description: prize.description,
        actionLabel:
          prize.actionLabel || (prize.urlHint ? "Открыть" : undefined),
        actionHref: prize.actionHref || prize.urlHint || undefined,
        badge:
          prize.kind === "certificate"
            ? "PNG"
            : prize.kind === "discount"
              ? "%"
              : prize.kind === "book"
                ? "PDF"
                : prize.kind === "medal"
                  ? "🏆"
                  : "↗",
      }))
    : undefined;
  const bookPrize = data.prizes.find((prize) => prize.kind === "book") || null;
  const discountPrize =
    data.prizes.find((prize) => prize.kind === "discount") || null;
  const discountValidUntil = discountPrize?.validUntil
    ? formatCertificateDate(discountPrize.validUntil)
    : "";
  const finalistProfilePath = data.certificate?.winnerUrlHint || "/winners";
  const finalistProfileUrl =
    typeof window === "undefined"
      ? finalistProfilePath
      : `${window.location.origin}${finalistProfilePath}`;
  const finishedDate = data.finished_at
    ? formatCertificateDate(data.finished_at)
    : "";
  const certificateLanguage = awardCopy.dative;
  const paymentProcessing =
    paymentReturn === "success" && data.payment_required;
  const paymentReturnTitle =
    paymentReturn === "success"
      ? paymentProcessing
        ? "Платеж обрабатывается"
        : "Оплата подтверждена"
      : "Оплата отменена";
  const paymentReturnBody =
    paymentReturn === "success"
      ? paymentProcessing
        ? "Мы проверяем подтверждение оплаты автоматически. Когда провайдер подтвердит платеж, задания откроются на этой странице."
        : "Оплата подтверждена, задания доступны из этого профиля."
      : "Списание не выполнено. Вы можете снова открыть оплату или обратиться в поддержку с этой страницы.";

  const startCheckout = async () => {
    if (!data) return;
    const selectedMethod = PAYMENT_METHOD_OPTIONS.find(
      (option) => option.value === paymentMethod,
    );
    if (selectedMethod?.disabled) {
      setCheckoutError(
        "Банковский перевод временно недоступен. Используйте PayPal или оплату банковской картой.",
      );
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const redirectUrl = await createPaymentCheckout(data.id, paymentMethod);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError(
        "Оплата создана, но корректная ссылка для перехода не вернулась.",
      );
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}#payment-access`);
        return;
      }
      setCheckoutError(
        error instanceof Error ? error.message : "Не удалось открыть оплату",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const submitNps = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || npsScore === null) {
      setNpsError("Выберите оценку от 0 до 10.");
      return;
    }
    setNpsSaving(true);
    setNpsError("");
    setNpsMessage("");
    try {
      const body = await saveNpsSurvey(data.id, npsScore, npsComment);
      setData({ ...data, nps_survey: body });
      setNpsMessage("Спасибо. Ваш отзыв о марафоне сохранен.");
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      setNpsError(
        error instanceof Error ? error.message : "Не удалось сохранить отзыв",
      );
    } finally {
      setNpsSaving(false);
    }
  };

  const buildCertificateCanvas = async () => {
    if (!data.medal || !data.finished_at) return null;
    const image = await loadImage(certificateImage(data.medal));
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 620;
    canvas.height = image.naturalHeight || 877;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawCertificateFields(context, canvas, {
      participantName: data.certificate?.participantName || participantName,
      languageDative: certificateLanguage,
      finishedDate,
    });

    return canvas;
  };

  const downloadCertificate = async (format: CertificateDownloadFormat) => {
    if (!data.medal || !data.finished_at) return;
    setDownloadingFormat(format);
    setDownloadError("");
    setShareStatus(null);
    try {
      const canvas = await buildCertificateCanvas();
      if (!canvas) return;
      if (format === "pdf") {
        downloadBlob(
          buildPdfBlobFromCanvas(canvas),
          buildCertificateFilename(data, "pdf"),
        );
      } else if (format === "jpeg") {
        downloadBlob(
          await canvasToBlob(canvas, "image/jpeg", 0.94),
          buildCertificateFilename(data, "jpg"),
        );
      } else {
        downloadBlob(
          await canvasToBlob(canvas, "image/png"),
          buildCertificateFilename(data, "png"),
        );
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Сертификат не удалось сформировать.",
      );
    } finally {
      setDownloadingFormat(null);
    }
  };

  const shareCertificate = async () => {
    if (!data.medal || !data.finished_at || sharingCertificate) return;
    setSharingCertificate(true);
    setDownloadError("");
    setShareStatus(null);

    try {
      const canvas = await buildCertificateCanvas();
      if (!canvas) return;
      const pngBlob = await canvasToBlob(canvas, "image/png");
      const file = new File([pngBlob], buildCertificateFilename(data, "png"), {
        type: "image/png",
      });
      const sharePayload = {
        title: "Мой сертификат SpeakASAP",
        text: data.certificate?.shareText || shareText,
        url: shareUrl,
        files: [file],
      };

      if (navigator.canShare?.(sharePayload) && navigator.share) {
        await navigator.share(sharePayload);
        setShareStatus({
          kind: "success",
          message:
            "Открылось системное меню: выберите Telegram, WhatsApp, Instagram или другое приложение.",
        });
        return;
      }

      downloadBlob(pngBlob, file.name);
      let copiedShareText = false;
      try {
        await navigator.clipboard?.writeText(
          `${data.certificate?.shareText || shareText} ${shareUrl}`,
        );
        copiedShareText = true;
      } catch {
        copiedShareText = false;
      }
      setShareStatus({
        kind: "fallback",
        message: copiedShareText
          ? "PNG скачан, а текст со ссылкой скопирован. Его можно вставить в любой чат или соцсеть."
          : "PNG скачан. Если браузер не разрешил копирование, отправьте файл и добавьте ссылку из адресной строки.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось подготовить сертификат для отправки.",
      });
    } finally {
      window.setTimeout(
        () => setSharingCertificate(false),
        SHARE_FALLBACK_DELAY_MS,
      );
    }
  };

  const copyFinalistProfileLink = async () => {
    setWinnerLinkStatus("");
    try {
      await navigator.clipboard?.writeText(finalistProfileUrl);
      setWinnerLinkStatus("Ссылка на ваш профиль финалиста скопирована.");
    } catch {
      setWinnerLinkStatus(
        "Скопируйте ссылку из адресной строки после открытия профиля.",
      );
    }

    window.setTimeout(() => setWinnerLinkStatus(""), 5000);
  };

  const submitCertificateName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;
    const displayName = certificateNameDraft.trim();
    if (!displayName) {
      setCertificateNameError("Укажите имя для сертификата.");
      setCertificateNameEditing(true);
      return;
    }

    setCertificateNameSaving(true);
    setCertificateNameError("");
    try {
      const nextData = await confirmCertificateName(data.id, displayName);
      setData(nextData);
      setProfile((currentProfile) => {
        const nextProfile = {
          displayName,
          email: currentProfile?.email || profile?.email || "",
          phone: currentProfile?.phone || profile?.phone || "",
          avatarUrl: currentProfile?.avatarUrl || profile?.avatarUrl || "",
          bio: currentProfile?.bio || profile?.bio || "",
        };
        window.dispatchEvent(
          new CustomEvent("marathon-profile-updated", { detail: nextProfile }),
        );
        return nextProfile;
      });
      setCertificateNameEditing(false);
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/profile/${data.id}`);
        return;
      }
      setCertificateNameError(
        error instanceof Error
          ? error.message
          : "Не удалось подтвердить имя для сертификата.",
      );
    } finally {
      setCertificateNameSaving(false);
    }
  };

  return (
    <div id="top" className="container page-static profile-dashboard">
      {!isFinished && (
        <section className="profile-hero-panel">
          <div>
            <h1>{stripHeadingTerminalPeriod(data.title)}</h1>
            {showBonusDays && (
              <p className="profile-meta">
                {`Бонусных дней: ${data.bonus_left} из ${data.bonus_total}.`}
              </p>
            )}
          </div>
          <div className="profile-progress-card">
            <span>Прогресс</span>
            <strong>{progressPct}%</strong>
            <div className="profile-progress-track">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </section>
      )}
      {isFinished && !certificateNameConfirmed && (
        <section
          className="profile-certificate-confirmation"
          aria-labelledby="certificate-name-title"
        >
          <div>
            <p className="profile-completion-kicker">Марафон завершен</p>
            <h1 id="certificate-name-title">Подтвердите имя для сертификата</h1>
            <p>
              Мы видим в вашем профиле имя{" "}
              <strong>{certificateNameConfirmation.currentName}</strong>.
              Подтвердите, что сертификат нужно выдать именно на это имя, или
              измените его перед генерацией. После подтверждения на этой
              странице появятся диплом, медаль, скидки и все призы.
            </p>
          </div>
          <form
            className="profile-certificate-confirmation__form"
            onSubmit={submitCertificateName}
          >
            {certificateNameEditing ? (
              <label htmlFor="certificate-display-name">
                Имя на сертификате
                <input
                  id="certificate-display-name"
                  value={certificateNameDraft}
                  onChange={(event) =>
                    setCertificateNameDraft(event.target.value)
                  }
                  maxLength={120}
                  autoFocus
                />
              </label>
            ) : null}
            <div className="profile-payment-actions">
              <button
                type="submit"
                className="btn-profile-open"
                disabled={certificateNameSaving}
              >
                {certificateNameSaving ? "Подтверждаем..." : "Да, подтверждаю"}
              </button>
              <button
                type="button"
                className="btn-profile-login"
                onClick={() => {
                  setCertificateNameEditing(true);
                  setCertificateNameError("");
                }}
                disabled={certificateNameSaving}
              >
                Изменить имя
              </button>
            </div>
            {certificateNameError && (
              <p className="ml-error">{certificateNameError}</p>
            )}
          </form>
        </section>
      )}
      {isFinished && certificateNameConfirmed && (
        <FinalistRewards
          participant={{
            name: data.certificate?.participantName || participantName,
            displayName: participantName,
          }}
          certificate={{
            title: data.certificate?.title || undefined,
            subtitle: medal?.detail || undefined,
            languageLabel: awardCopy.dative,
            previewImageUrl: certificatePreviewUrl || undefined,
          }}
          prizes={finalistPrizes}
          medal={data.medal}
          marathonTitle={stripHeadingTerminalPeriod(data.title)}
          finishedAt={data.finished_at}
          shareUrl={shareUrl}
          shareText={data.certificate?.shareText || shareText}
          onDownloadPdf={() => downloadCertificate("pdf")}
          onShare={shareCertificate}
          certificateActions={(
            <section
              className="profile-finalist-details"
              aria-label="Скачать диплом и поделиться результатом"
            >
              <div className="profile-finalist-details__actions">
                <div>
                  <h2>Скачать диплом и поделиться результатом</h2>
                  <p>
                    PDF подходит для печати и архива, PNG или JPEG удобно отправить
                    в чат, Telegram, WhatsApp или соцсети.
                  </p>
                </div>
                <div
                  className="profile-certificate-downloads"
                  aria-label="Скачать сертификат"
                >
                  {CERTIFICATE_DOWNLOAD_FORMATS.map(({ format, label }) => (
                    <button
                      key={format}
                      type="button"
                      className="btn-profile-open"
                      onClick={() => downloadCertificate(format)}
                      disabled={downloadingFormat !== null || sharingCertificate}
                    >
                      {downloadingFormat === format
                        ? "Формируем..."
                        : `Скачать ${label}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-profile-login"
                    onClick={shareCertificate}
                    disabled={sharingCertificate || downloadingFormat !== null}
                  >
                    {sharingCertificate ? "Готовим..." : "Поделиться сертификатом"}
                  </button>
                </div>
                {shareStatus && (
                  <p
                    className={`profile-certificate-share-status profile-certificate-share-status--${shareStatus.kind}`}
                  >
                    {shareStatus.message}
                  </p>
                )}
                {downloadError && <p className="ml-error">{downloadError}</p>}
              </div>
            </section>
          )}
        />
      )}
      {isFinished && certificateNameConfirmed && (
        <section
          className="profile-finalist-details"
          aria-label="Все призы финалиста"
        >
          <div className="profile-awards-grid profile-finalist-details__grid">
            <article>
              <span className="profile-awards-card-icon">PDF</span>
              <h2>Книга «Точка выхода»</h2>
              <p>
                PDF-книга о том, как перестать бесконечно учить язык и начать им
                пользоваться.
              </p>
              <a
                className="btn-profile-open"
                href={bookPrize?.actionHref || BOOK_PRIZE_URL}
                target="_blank"
                rel="noreferrer"
              >
                {bookPrize?.actionLabel || "Скачать книгу"}
              </a>
            </article>
            <article>
              <span className="profile-awards-card-icon">%</span>
              <h2>Скидка на следующий курс</h2>
              <p>
                {discountPrize?.title || awardCopy.nextStep}. Персональный бонус
                доступен после финиша и привязан к вашему результату.
              </p>
              {discountPrize?.discountCode ? (
                <p className="profile-awards-code">
                  <strong>{discountPrize.discountCode}</strong>
                </p>
              ) : null}
              {discountValidUntil ? (
                <p>Действует до {discountValidUntil}.</p>
              ) : null}
              {discountPrize?.actionHref ? (
                <a
                  className="btn-profile-open"
                  href={discountPrize.actionHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {discountPrize.actionLabel || "Применить скидку"}
                </a>
              ) : null}
            </article>
            <article>
              <span className="profile-awards-card-icon">🏆</span>
              <h2>Кубок и профиль финалиста</h2>
              <p>
                Ваш результат сохранен в списке финалистов. Ссылку можно
                отправить друзьям вместе с дипломом и медалью.
              </p>
              <p className="profile-awards-profile-link">
                Ссылка на ваш профиль финалиста:{" "}
                <span>{finalistProfileUrl}</span>
              </p>
              <div className="profile-awards-card-actions">
                <Link className="btn-profile-open" to={finalistProfilePath}>
                  Посмотреть меня среди финалистов
                </Link>
                <button
                  type="button"
                  className="btn-profile-login"
                  onClick={copyFinalistProfileLink}
                >
                  Скопировать ссылку
                </button>
              </div>
              {winnerLinkStatus ? (
                <p className="profile-awards-link-status">{winnerLinkStatus}</p>
              ) : null}
            </article>
          </div>

          <section className="profile-awards-next profile-finalist-details__next">
            <h2>Что дальше?</h2>
            <p>{awardCopy.nextStep}</p>
            <div className="profile-payment-actions">
              <Link className="btn-profile-open" to="/register">
                Выбрать следующий марафон
              </Link>
              <a className="btn-profile-open" href={basicCourseUrl} target="_blank" rel="noreferrer">
                Записаться на курс
              </a>
            </div>
          </section>
        </section>
      )}
      {paymentReturn && (
        <section
          className={`profile-payment-return profile-payment-return-${paymentReturn}`}
        >
          <div className="profile-payment-return-copy">
            {paymentProcessing && (
              <span className="profile-payment-spinner" aria-hidden="true" />
            )}
            <div>
              <h2>{paymentReturnTitle}</h2>
              <p>{paymentReturnBody}</p>
              {paymentStatusError && (
                <p className="ml-error">{paymentStatusError}</p>
              )}
            </div>
          </div>
        </section>
      )}
      {data.payment_required && !paymentProcessing && (
        <section className="profile-payment-panel" id="payment-access">
          <div>
            <h2>Нужна оплата марафона</h2>
            <p>
              Оплатите марафон, чтобы открыть задания и продолжить прохождение.
            </p>
            {checkoutError && <p className="ml-error">{checkoutError}</p>}
          </div>
          <div
            className="profile-payment-methods"
            role="radiogroup"
            aria-label="Способ оплаты"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={[
                  "profile-payment-method",
                  paymentMethod === option.value ? "selected" : "",
                  option.disabled ? "disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => {
                    if (!option.disabled) setPaymentMethod(option.value);
                  }}
                  disabled={checkoutLoading || option.disabled}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="profile-payment-actions">
            <button
              type="button"
              className="btn-profile-open profile-payment-cta"
              onClick={startCheckout}
              disabled={
                checkoutLoading ||
                PAYMENT_METHOD_OPTIONS.find(
                  (option) => option.value === paymentMethod,
                )?.disabled
              }
            >
              {checkoutLoading ? "Открываем оплату..." : "Оплатить"}
            </button>
          </div>
        </section>
      )}
      {current && !data.finished_at && (
        <section className="profile-current">
          <h2>Текущий этап</h2>
          <p>
            <strong>{current.title}</strong>
          </p>
          <p>{getStepStatusText(current)}</p>
          <Link
            to={`/steps/${current.stepId}?marathonerId=${encodeURIComponent(data.id)}`}
            className="btn-profile-open"
          >
            Открыть задание
          </Link>
        </section>
      )}
      {data.finished_at && !data.nps_survey && (
        <section className="profile-nps-panel">
          <div>
            <h2>Отзыв о марафоне</h2>
            <p>
              Ваша личная оценка помогает улучшать будущие задания и поддержку
              марафона.
            </p>
          </div>
          <form onSubmit={submitNps} className="profile-nps-form">
            <fieldset>
              <legend>
                Насколько вероятно, что вы порекомендуете этот марафон?
              </legend>
              <div className="profile-nps-scale">
                {Array.from({ length: 11 }, (_, score) => (
                  <label
                    key={score}
                    className={npsScore === score ? "is-selected" : ""}
                  >
                    <input
                      type="radio"
                      name="nps-score"
                      value={score}
                      checked={npsScore === score}
                      onChange={() => setNpsScore(score)}
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="nps-comment">Что нам улучшить?</label>
            <textarea
              id="nps-comment"
              value={npsComment}
              onChange={(event) => setNpsComment(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Необязательная личная заметка для команды марафона"
            />
            <div className="profile-payment-actions">
              <button
                type="submit"
                className="btn-profile-open"
                disabled={npsSaving || npsScore === null}
              >
                {npsSaving ? "Сохранение..." : "Сохранить отзыв"}
              </button>
            </div>
            {npsMessage && <p className="step-submit-success">{npsMessage}</p>}
            {npsError && <p className="ml-error">{npsError}</p>}
          </form>
        </section>
      )}
      <section className="profile-steps">
        <h2>{isFinished ? "Пройденные темы" : "Этапы"}</h2>
        <ul className="profile-answers">
          {data.answers.map((a) => {
            const paymentBlocked = a.block_reason === "payment_required";
            const canOpen = Boolean(a.can_open) && !paymentBlocked;
            return (
              <li
                key={String(a.id)}
                className={`answer-state-${a.state}${paymentBlocked ? " answer-state-payment-required" : ""}`}
              >
                <div className="profile-step-main">
                  <div className="profile-step-heading">
                    <span className="answer-title">{a.title}</span>
                    {!paymentBlocked && (
                      <span className="answer-state">{getStateLabel(a)}</span>
                    )}
                  </div>
                  <span className="profile-step-meta">
                    {getStepStatusText(a)}
                  </span>
                </div>
                {canOpen && (
                  <Link
                    className="profile-step-action"
                    to={`/steps/${a.stepId}?marathonerId=${encodeURIComponent(data.id)}`}
                  >
                    {a.state === "inactive" ? "Открыть заранее" : "Открыть"}
                  </Link>
                )}
                {!canOpen && !paymentBlocked && (
                  <span className="profile-step-action profile-step-action-disabled">
                    Закрыто
                  </span>
                )}
              </li>
            );
          })}
          {data.answers.length > 0 && (
            <li
              className={`profile-awards-step answer-state-${isFinished ? "active" : "inactive"}`}
            >
              <div className="profile-step-main">
                <div className="profile-step-heading">
                  <span className="answer-title">Награждение</span>
                  <span className="answer-state">{isFinished ? "Призы" : "Закрыто"}</span>
                </div>
                <span className="profile-step-meta">
                  {isFinished
                    ? "Сертификат за марафон и другие призы находятся здесь."
                    : "Сертификат за марафон и призы откроются здесь после завершения всех этапов."}
                </span>
              </div>
              {isFinished ? (
                <Link
                  className="profile-step-action profile-awards-step-action"
                  to={`/profile/${encodeURIComponent(data.id)}#top`}
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                  }}
                >
                  Открыть призы
                </Link>
              ) : (
                <span className="profile-step-action profile-step-action-disabled">
                  Закрыто
                </span>
              )}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
