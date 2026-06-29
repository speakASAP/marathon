import type { AssignmentBlock } from "../../api/assignmentMarathon";
import { isReadingRulesTitle } from "./assignmentBlockNormalization";
import { AssignmentFieldRenderer } from "./AssignmentFieldRenderer";
import type { AnswerValue, Answers } from "./assignmentRendererTypes";
import { KnownWordsBlock } from "./KnownWordsBlock";
import { mediaAudioUrl, youtubeEmbedUrl } from "./media";

type AssignmentBlockRendererProps = {
  block: AssignmentBlock;
  answers: Answers;
  readOnly: boolean;
  validationError?: string;
  onAnswerChange: (name: string, value: AnswerValue) => void;
};

function isDownloadHref(href: string) {
  return /\.(?:pdf|zip|docx?|xlsx?|pptx?|mp3|mp4|wav|ogg)(?:[?#]|$)/i.test(href);
}

function renderInlineLinkedText(text: string, links?: Array<{ text: string; href: string }>) {
  const normalizedLinks = (links || []).filter((link) => link.text && link.href);
  if (!normalizedLinks.length) return text;

  const parts: JSX.Element[] = [];
  let remaining = text;
  let key = 0;

  for (const link of normalizedLinks) {
    const index = remaining.indexOf(link.text);
    if (index < 0) continue;
    const before = remaining.slice(0, index);
    if (before) parts.push(<span key={`text-${key++}`}>{before}</span>);
    parts.push(
      <a className="step-assignment-link" href={link.href} key={`link-${key++}`} target="_blank" rel="noreferrer">
        {link.text}
      </a>,
    );
    remaining = remaining.slice(index + link.text.length);
  }

  if (remaining) parts.push(<span key={`text-${key++}`}>{remaining}</span>);
  return parts.length ? parts : text;
}

function readingRuleParts(item: string) {
  const normalized = item.replace(/\s+/g, " ").trim();
  const pronounced = normalized.match(/^(.+?)\s+читается\s+как\s+([^,]+),?\s*(.*)$/i);
  if (pronounced) {
    return { symbol: pronounced[1].trim(), sound: `читается как ${pronounced[2].trim()}`, example: pronounced[3].trim() };
  }

  const dashed = normalized.match(/^(.+?)\s+-\s+(\[[^\]]+\])\s*-?\s*(.*)$/);
  if (dashed) {
    return { symbol: dashed[1].trim(), sound: dashed[2].trim(), example: dashed[3].trim() };
  }

  return { symbol: normalized, sound: "", example: "" };
}

export function AssignmentBlockRenderer({ block, answers, readOnly, validationError, onAnswerChange }: AssignmentBlockRendererProps) {
  if (block.type === "text") {
    if (block.style === "heading") {
      return <h2 className="step-assignment-heading">{block.text}</h2>;
    }

    const className = block.style === "lead" ? "step-assignment-lead" : "step-assignment-paragraph";
    return <p className={className}>{renderInlineLinkedText(block.text, block.links)}</p>;
  }

  if (block.type === "quote") {
    return <blockquote className="step-assignment-quote">{block.text}</blockquote>;
  }

  if (block.type === "list") {
    const isReadingRules = Boolean(block.title && isReadingRulesTitle(block.title));
    return (
      <section className={`step-assignment-list-panel${isReadingRules ? " reading-rules" : ""}`}>
        {block.title && <h3>{block.title}</h3>}
        {isReadingRules ? (
          <div className="step-reading-rule-grid">
            {block.items.map((item, index) => {
              const parts = readingRuleParts(item);
              return (
                <div className="step-reading-rule" key={`${block.id}-${index}`}>
                  <strong>{parts.symbol}</strong>
                  {parts.sound && <span>{parts.sound}</span>}
                  {parts.example && <em>{parts.example}</em>}
                </div>
              );
            })}
          </div>
        ) : (
          <ul>
            {block.items.map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}
          </ul>
        )}
      </section>
    );
  }

  if (block.type === "link") {
    const isDownload = Boolean(block.download && isDownloadHref(block.href));
    return (
      <p className={isDownload ? "step-assignment-link-row is-download" : "step-assignment-link-row"}>
        <a className={isDownload ? "step-assignment-download-button" : "step-assignment-link"} href={block.href} target="_blank" rel="noreferrer" download={isDownload || undefined}>
          {isDownload && <i className="fa fa-download" aria-hidden="true" />}
          <span>{block.text}</span>
        </a>
      </p>
    );
  }

  if (block.type === "knownWords") {
    return <KnownWordsBlock block={block} onChange={onAnswerChange} readOnly={readOnly} value={answers[block.name]} />;
  }

  if (block.type === "video") {
    return (
      <section className="step-video-block" aria-label="Видео задания">
        <iframe
          src={youtubeEmbedUrl(block.code)}
          title={block.title || `Видео задания ${block.code}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </section>
    );
  }

  if (block.type === "audio") {
    const mp3Url = mediaAudioUrl(block.code, "mp3");
    return (
      <div className="step-audio-block">
        {block.title && <strong>{block.title}</strong>}
        <audio controls preload="metadata">
          <source src={mp3Url} type="audio/mpeg" />
          <source src={mediaAudioUrl(block.code, "ogg")} type="audio/ogg" />
        </audio>
        <a href={mp3Url} download>Скачать MP3</a>
      </div>
    );
  }

  return (
    <AssignmentFieldRenderer
      block={block}
      onChange={onAnswerChange}
      readOnly={readOnly}
      validationError={validationError}
      value={answers[block.name]}
    />
  );
}
