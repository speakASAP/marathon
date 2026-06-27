const MARATHON_AUDIO_BASE_URL = "https://minio.alfares.cz/catalog-media/marathon/audio";

export function youtubeEmbedUrl(code: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(code)}`;
}

function encodeMediaPath(value: string) {
  return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function mediaAudioUrl(code: string, extension: "mp3" | "ogg") {
  if (/^https?:\/\//i.test(code)) return code;
  const normalized = code.replace(/^\/+/, "").replace(/\.(mp3|ogg)$/i, "");
  return `${MARATHON_AUDIO_BASE_URL}/${encodeMediaPath(normalized)}.${extension}`;
}
