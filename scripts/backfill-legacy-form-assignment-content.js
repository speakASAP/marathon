#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_LEGACY_ROOT = '/home/ssf/Documents/Github/speakasap-portal';

const LANGUAGE_FOLDERS = {
  cz: 'czech',
  cs: 'czech',
  da: 'danish',
  de: 'german',
  dk: 'danish',
  en: 'english',
  es: 'spanish',
  fr: 'french',
  it: 'italian',
  nb: 'norwegian',
  nl: 'dutch',
  nn: 'norwegian',
  no: 'norwegian',
  pl: 'polish',
  pt: 'portuguese',
  se: 'swedish',
  sv: 'swedish',
  tr: 'turkish',
};

function usage(exitCode = 0) {
  const out = [
    'Usage:',
    '  node scripts/backfill-legacy-form-assignment-content.js [--apply] [--legacy-root <path>] [--forms-json <path>] [--sequence <n>] [--form-key <name>] [--language-code <code>]',
    '  node scripts/backfill-legacy-form-assignment-content.js --dump-forms-json <path> [--legacy-root <path>]',
    '',
    'Dry-run by default. Reads legacy Django marathon form templates and form metadata,',
    'then updates MarathonStep.assignmentContent fallback and assignmentBlocks structured JSON.',
  ].join('\n');
  (exitCode ? process.stderr : process.stdout).write(`${out}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = { apply: false, legacyRoot: DEFAULT_LEGACY_ROOT, formsJson: '', dumpFormsJson: '', sequence: '', formKey: '', languageCode: '' };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--apply') opts.apply = true;
    else if (arg === '--legacy-root') opts.legacyRoot = args[++i];
    else if (arg === '--forms-json') opts.formsJson = args[++i];
    else if (arg === '--dump-forms-json') opts.dumpFormsJson = args[++i];
    else if (arg === '--sequence') opts.sequence = args[++i];
    else if (arg === '--form-key') opts.formKey = args[++i];
    else if (arg === '--language-code') opts.languageCode = String(args[++i] || '').toLowerCase();
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  return opts;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, ' - ')
    .replace(/&ndash;/g, ' - ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(text) {
  return decodeEntities(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripHtmlToText(html) {
  return cleanText(html
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|fieldset|legend|li|ol|ul|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<(p|div|fieldset|legend|li|ol|ul|h[1-6]|tr|section)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
}

function choiceLabel(choice) {
  if (choice && typeof choice === 'object') return stripHtmlToText(choice.label || choice.value || '');
  return stripHtmlToText(String(choice || ''));
}

function choiceValue(choice) {
  if (choice && typeof choice === 'object') return stripHtmlToText(choice.value || choice.label || '');
  return stripHtmlToText(String(choice || ''));
}

function branchFromClass(classValue) {
  const normalized = String(classValue || '').trim().split(/\s+/);
  if (normalized.includes('js-beginner-medium')) return 'beginner-medium';
  if (normalized.includes('js-beginner')) return 'beginner';
  if (normalized.includes('js-medium')) return 'medium';
  if (normalized.includes('js-advanced')) return 'advanced';
  return null;
}

function currentLink(stack) {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].tag === 'a' && stack[index].href) return stack[index].href;
  }
  return null;
}

const SPEAKASAP_BASE_URL = 'https://speakasap.com';

const LEGACY_RADIOS = {
  german: [
    ['http://live.alternativefm.de/afm_128.mp3', 'Rock'],
    ['https://stream.lokalradio.nrw/444zchk', 'Radio Herne'],
    ['http://br-mp3-b5aktuell-s.akacast.akamaistream.net/7/773/142694/v1/gnl.akacast.akamaistream.net/br_mp3_b5aktuell_s', 'B5 Aktuell'],
  ],
  english: [
    ['http://bbcmedia.ic.llnwd.net/stream/bbcmedia_radio5live_mf_p', 'BBC 5 Live'],
    ['http://bbcwssc.ic.llnwd.net/stream/bbcwssc_mp1_ws-eieuk', 'BBC World Service'],
  ],
  spanish: [['http://radio5.rtveradio.cires21.com/radio5/mp3/icecast.audio', 'RNE Radio 5 Todo Noticias']],
  french: [['http://direct.franceculture.fr/live/franceculture-midfi.mp3?ID=f9fbk29m84', 'France Culture']],
  italian: [['http://icestreaming.rai.it/1.mp3', 'Ascoltare']],
  czech: [
    ['http://icecast2.play.cz/rockzone128.mp3', 'Rock'],
    ['http://icecast2.play.cz/croregina128.mp3', 'Pop'],
    ['http://icecast8.play.cz/radio7-128.mp3', 'Mluvené'],
  ],
  turkish: [['http://stream.34bit.net/ar64.mp3', 'Acik Radyo']],
  portuguese: [
    ['http://centova.radios.pt:9478/;listen.pls', 'Portuguese'],
    ['http://transamerica.crossradio.com.br:9100/live.aac', 'Brasil'],
  ],
  dutch: [
    ['http://icecast.omroep.nl/radio2-bb-mp3', 'Radio2.nl'],
    ['http://icecast.omroep.nl/3fm-bb-mp3', 'NPO 3FM'],
  ],
  norwegian: [
    ['http://lyd.nrk.no/nrk_radio_p1_ostlandssendingen_mp3_l', 'NRK P1'],
    ['http://lyd.nrk.no/nrk_radio_p2_mp3_m', 'NRK P2'],
    ['http://lyd.nrk.no/nrk_radio_p3_mp3_m', 'NRK P3'],
  ],
  polish: [
    ['http://stream4.nadaje.com:9230/rwkultura', 'Radio Wroclaw Kultura'],
    ['http://s5.deb1.scdn.smcloud.net/t050-1.mp3', 'WAWA'],
  ],
  swedish: [
    ['https://http-live.sr.se/p1-mp3-192?type=mp3', 'SR P1'],
    ['https://http-live.sr.se/p4stockholm-mp3-192', 'SR P4 Stockholm'],
    ['https://wr13-ice.stream.khz.se/wr13_mp3?platform=web', 'Svenskafavoriter'],
    ['https://fm02-ice.stream.khz.se/fm02_mp3', 'Bandit Rock'],
    ['https://fm01-ice.stream.khz.se/fm01_mp3', 'Rix FM'],
    ['https://live-bauerse-fm.sharp-stream.com/svenskpop_se_aacp', 'Svensk Pop'],
  ],
  danish: [
    ['http://live-icy.gss.dr.dk:8000/A/A03L.mp3', 'DR P1'],
    ['http://live-icy.gss.dr.dk:8000/A/A02L.mp3', 'DR Nyheder'],
    ['http://live-icy.gss.dr.dk:8000/A/A05L.mp3', 'DR P3'],
    ['http://live-icy.gss.dr.dk:8000/A/A29L.mp3', 'DR P6 Beat'],
  ],
};

function radioStationsForTag(tagName) {
  const language = String(tagName || '').replace(/^radio_/, '');
  return (LEGACY_RADIOS[language] || []).map(([url, label]) => ({ url, label }));
}

function currentInlineRun(stack) {
  const marks = [];
  let tone = '';
  for (const item of stack) {
    if (item.mark && !marks.includes(item.mark)) marks.push(item.mark);
    if (item.tone) tone = item.tone;
  }
  const href = currentLink(stack);
  return { ...(marks.length ? { marks } : {}), ...(tone ? { tone } : {}), ...(href ? { href } : {}) };
}

function inlineMetaFromTag(tag, attrs) {
  const classValue = htmlAttr(attrs, 'class');
  const classes = classValue.split(/\s+/).filter(Boolean);
  const meta = {};
  if (tag === 'b' || tag === 'strong') meta.mark = 'strong';
  if (tag === 'i' || tag === 'em') meta.mark = 'em';
  if (classes.includes('text-muted')) meta.tone = 'muted';
  if (classes.includes('text-danger')) meta.tone = 'danger';
  if (classes.includes('text-alert')) meta.tone = 'alert';
  return meta;
}

function pushRichTextBlock(blocks, rawText, branch, runMeta) {
  const text = normalizeInstructionText(stripHtmlToText(rawText));
  if (!text) return;
  if (runMeta?.href && isGenericSettingsLink(text, runMeta.href)) return;
  const content = [{ text, ...(runMeta?.href ? { href: runMeta.href } : {}), ...(runMeta?.marks ? { marks: runMeta.marks } : {}), ...(runMeta?.tone ? { tone: runMeta.tone } : {}) }];
  blocks.push({
    id: `text-${blocks.length}`,
    type: 'text',
    text,
    content,
    ...(runMeta?.href ? { links: [{ text, href: runMeta.href }] } : {}),
    ...(branch ? { branch } : {}),
  });
}

function blockPlainText(block) {
  if (!block) return '';
  if (block.type === 'text') return block.text || '';
  if (block.type === 'link') return block.text || '';
  if (block.type === 'video') return `Видео: ${block.code}`;
  if (block.type === 'audio') return `Аудио: ${block.code}`;
  if (block.type === 'radio') return `Радио: ${(block.stations || []).map((station) => station.label).join('; ')}`;
  if (block.type === 'image') return block.alt || block.caption || '';
  if (block.type === 'knownWords') return [block.label, ...(block.paragraphs || [])].filter(Boolean).join(' ');
  if (block.type === 'field') return block.label || '';
  if (block.type === 'list') return (block.items || []).map(listItemPlainText).filter(Boolean).join(' ');
  return '';
}

function listItemPlainText(item) {
  if (typeof item === 'string') return item;
  return item.text || (item.blocks || []).map(blockPlainText).filter(Boolean).join(' ');
}

function listItemFromBlocks(blocks) {
  const normalizedBlocks = normalizeTextBlockSequence(blocks);
  const textBlocks = normalizedBlocks.filter((block) => block.type === 'text');
  const otherBlocks = normalizedBlocks.filter((block) => block.type !== 'text');
  const text = normalizedBlocks.map(blockPlainText).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const links = textBlocks.flatMap((block) => block.links || []);
  const content = textBlocks.flatMap((block) => block.content || []);
  const item = {};
  if (text) item.text = text;
  if (links.length) item.links = links;
  if (content.length) item.content = content;
  if (otherBlocks.length) item.blocks = normalizedBlocks;
  return item;
}


function parseTemplateTagArgs(source) {
  const args = [];
  const pattern = /'([^']*)'|"([^"]*)"|(-?\d+)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }
  return args;
}

function speakasapPathForRoute(routeName, args) {
  const route = String(routeName || '').trim();
  const [lang, second] = args;
  const singleLanguageRoutes = {
    seven: 'seven',
    grammar: 'grammar',
    phonetics: 'phonetics',
    songs: 'songs',
    basic: 'basic',
    basic_2: 'basic_2',
    group: 'group',
    mini: 'mini',
    extra: 'extra',
    mini_group: 'mini_group',
    native: 'native',
    demo_native: 'native/demo',
    tef: 'tef',
    mvv: 'mvv',
    mvv2: 'mvv2',
    card: 'card',
    migrants: 'migrants',
    b2: 'b2_25',
    b2_25: 'b2_25',
    b2_10: 'b2_10',
    mp3: 'mp3',
    demo: 'demo',
  };

  if (route === 'seven_lesson' && lang && second) return `/${lang}/seven/${second}/`;
  if (route === 'seven_lesson_app' && lang && second) return `/${lang}/seven/${second}/app/`;
  if (route === 'seven_lesson_email' && lang && second) return `/${lang}/seven/${second}/email/`;
  if (route === 'grammar_lesson' && lang && second) return `/${lang}/grammar/${second}/`;
  if (route === 'phonetics_lesson' && lang && second) return `/${lang}/phonetics/${second}/`;
  if (route === 'songs_lesson' && lang && second) return `/${lang}/songs/${second}/`;
  if (Object.prototype.hasOwnProperty.call(singleLanguageRoutes, route) && lang) {
    return `/${lang}/${singleLanguageRoutes[route]}/`;
  }
  if (route === 'marathon:faq') return '/faq';
  if (route === 'marathon:marathon' && lang) return `/${lang}/`;
  if (route === 'profile') return '/profile/';
  if (route === 'profile_settings') return '/profile/settings/';
  if (route === 'home') return '/';
  return '';
}

function resolveTemplateHref(rawHref) {
  const href = decodeEntities(String(rawHref || '').trim());
  if (!href) return '';
  const mediaHref = href.replace(/\{%\s*get_media_prefix\s*%\}/g, 'https://speakasap.com/media/');
  const templateTag = mediaHref.match(/^\{%\s*(?:host_url|url)\s*([\s\S]*?)%\}([\s\S]*)$/);
  if (templateTag) {
    const [routeName, ...args] = parseTemplateTagArgs(templateTag[1]);
    const path = speakasapPathForRoute(routeName, args);
    if (path) return `${SPEAKASAP_BASE_URL}${path}${String(templateTag[2] || '').replace(/\s+/g, '')}`;
  }
  const compactHref = mediaHref.replace(/\s+/g, '');
  const compactTemplateTag = compactHref.match(/^\{%(?:host_url|url)'([^']+)'((?:'[^']+')*)%\}([\s\S]*)$/);
  if (compactTemplateTag) {
    const routeName = compactTemplateTag[1];
    const args = Array.from(compactTemplateTag[2].matchAll(/'([^']+)'/g), (match) => match[1]);
    const path = speakasapPathForRoute(routeName, args);
    if (path) return `${SPEAKASAP_BASE_URL}${path}${compactTemplateTag[3] || ''}`;
  }
  return compactHref;
}

const FIRST_STEP_PLATFORM_PROGRAM_CHOICE = { value: 'Программы', label: 'Программы' };

function normalizeFirstStepPlatformChoices(fieldName, field, choices) {
  if (
    fieldName !== 'm3'
    || !/Какие площадки для изучения вам больше всего нравятся/i.test(String(field?.label || ''))
    || choices.some((choice) => choice.value === FIRST_STEP_PLATFORM_PROGRAM_CHOICE.value)
  ) {
    return choices;
  }
  return [...choices, FIRST_STEP_PLATFORM_PROGRAM_CHOICE];
}

function normalizeInstructionText(text) {
  return String(text || '')
    .replace(/Если не знаете правильный ответ, используйте подсказку\s*-\s*$/i, 'Если не знаете правильный ответ, используйте подсказку')
    .trim();
}

function fieldBlock(fieldName, field, branch, index, extra = {}) {
  if (!field || field.hidden || !field.label || field.label.toLowerCase() === 'text') return null;
  const choices = normalizeFirstStepPlatformChoices(
    fieldName,
    field,
    Array.isArray(field.choices)
      ? field.choices.map((choice) => ({ value: choiceValue(choice), label: choiceLabel(choice) })).filter((choice) => choice.value && choice.label)
      : [],
  );
  const fieldType = field.fieldType || (choices.length ? 'radio' : 'textarea');
  const label = stripHtmlToText(field.label);
  if (!label) return null;
  const correctAnswers = Array.isArray(field.correctAnswers)
    ? field.correctAnswers.map((answer) => stripHtmlToText(answer)).filter(Boolean)
    : [];
  return {
    id: `field-${index}-${fieldName}`,
    type: 'field',
    name: fieldName,
    label,
    fieldType,
    required: field.required !== false,
    choices,
    ...(correctAnswers.length ? { correctAnswers, hint: correctAnswers.join(', ') } : {}),
    ...extra,
    ...(branch ? { branch } : {}),
  };
}

function currentBranch(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].branch) return stack[i].branch;
  }
  return null;
}

function isDownloadHref(href) {
  return /\.(?:pdf|zip|docx?|xlsx?|pptx?|mp3|mp4|wav|ogg)(?:[?#]|$)/i.test(href);
}

function isGenericSettingsLink(text, href) {
  return /^настроек\.?$/i.test(text) && /^\/profile\/?(?:[?#].*)?$/i.test(href);
}

function htmlAttr(attrs, name) {
  const pattern = new RegExp(`${name}=(['\"])([\\s\\S]*?)\\1`, 'i');
  const match = String(attrs || '').match(pattern);
  return match ? decodeEntities(match[2]).trim() : '';
}


function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function legacyTableRowsToTags(html) {
  return String(html || '').replace(
    /<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>\s*\{%\s*render_field\s+form\.([A-Za-z0-9_]+)[^%]*%\}\s*<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi,
    (_match, rawPrefix, fieldName, rawSuffix) => {
      const prefix = stripHtmlToText(rawPrefix);
      const suffix = stripHtmlToText(rawSuffix);
      if (!prefix || !suffix) return _match;
      return `<legacy-table-row data-field="${escapeHtmlAttr(fieldName)}" data-prefix="${escapeHtmlAttr(prefix)}" data-suffix="${escapeHtmlAttr(suffix)}"></legacy-table-row>`;
    },
  );
}

function pushImageBlock(blocks, attrs, branch) {
  const rawSrc = htmlAttr(attrs, 'src');
  const src = rawSrc ? resolveTemplateHref(rawSrc) : '';
  if (!src) return;
  const alt = stripHtmlToText(htmlAttr(attrs, 'alt'));
  blocks.push({
    id: `image-${blocks.length}`,
    type: 'image',
    src,
    ...(alt ? { alt } : {}),
    ...(branch ? { branch } : {}),
  });
}

function pushTextBlock(blocks, rawText, branch, href = null) {
  const text = normalizeInstructionText(stripHtmlToText(rawText));
  if (!text) return;
  if (href) {
    if (isGenericSettingsLink(text, href)) return;
    if (/^#choice-\d+$/i.test(href) && /^Текст\s+\d+\.?$/i.test(text)) return;
    blocks.push({
      id: `link-${blocks.length}`,
      type: 'link',
      text,
      href,
      download: isDownloadHref(href),
      inline: true,
      ...(branch ? { branch } : {}),
    });
    return;
  }
  blocks.push({
    id: `text-${blocks.length}`,
    type: 'text',
    text,
    ...(branch ? { branch } : {}),
  });
}

function isOptionalStep1Note(text) {
  return /^\(дальше\s+заполнять\s+необязательно\)\.?$/i.test(text);
}

function isSentenceContinuation(previousText, text) {
  const previous = String(previousText || "").trim();
  if (!previous || /[.!?…:;]$/.test(previous)) return false;
  if (/^(?:[-–—*•]|\d+[.)])\s*/.test(text)) return false;
  return /^[а-яёa-z]/.test(text);
}

function normalizeTextBlockText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

const GENERIC_NEXT_SCHEDULE_INSTRUCTION = /Сформируйте отчет[,.]?\s*Новый этап появится в то\s*(?:⏰\s*)?время,\s*которое вы указали на странице(?:\s*⚙️?)?(?:\s*настроек\.?)?/gi;

function stripGenericNextScheduleInstruction(text) {
  return String(text || "").replace(GENERIC_NEXT_SCHEDULE_INSTRUCTION, "").replace(/\s+/g, " ").trim();
}

function shouldJoinWithPrevious(previous, text) {
  if (!previous || previous.type !== "text") return false;
  if (Array.isArray(previous.links) && previous.links.length && /^[)\]}>»]/.test(text)) return true;
  if (Array.isArray(previous.links) && previous.links.length && /^\(/.test(text)) return true;
  return /^[.!?,;:]+$/.test(text)
    || (/^настроек\.?$/i.test(text) && /^Сформируйте отчет\./i.test(previous.text))
    || isSentenceContinuation(previous.text, text);
}

function classContainsKnownWords(attrs) {
  const classValue = htmlAttr(attrs, 'class');
  return /(?:^|\s)known-words(?:\s|$)/i.test(classValue);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^$\{}()|[\]\\]/g, '\\$&');
}

function attrsContainId(attrs, id) {
  const escaped = escapeRegExp(id);
  return new RegExp("\\bid\\s*=\\s*[\"']" + escaped + "[\"']", 'i').test(attrs);
}

function knownWordsParagraphsFromHtml(fragment) {
  const paragraphs = [];
  const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = paragraphPattern.exec(fragment)) !== null) {
    const text = normalizeInstructionText(stripHtmlToText(match[1]));
    if (text) paragraphs.push(text);
  }
  if (paragraphs.length) return paragraphs;
  const text = normalizeInstructionText(stripHtmlToText(fragment));
  return text ? [text] : [];
}

function extractLegacyKnownWordsParagraphs(templatesRoot, folder, sourceForm, sourceName) {
  const sourceTemplate = path.join(templatesRoot, folder, `${sourceForm}.html`);
  if (!fs.existsSync(sourceTemplate)) return [];
  const html = fs.readFileSync(sourceTemplate, 'utf8').replace(/\{#[\s\S]*?#\}/g, '\n');
  const openPattern = /<div\b([^>]*)>/gi;
  let open;
  while ((open = openPattern.exec(html)) !== null) {
    const attrs = open[1] || '';
    if (!attrsContainId(attrs, sourceName) || !classContainsKnownWords(attrs)) continue;
    const start = openPattern.lastIndex;
    const closeIndex = html.indexOf('</div>', start);
    if (closeIndex < 0) return [];
    return knownWordsParagraphsFromHtml(html.slice(start, closeIndex));
  }
  return [];
}

function pushKnownWordsBlock(blocks, paragraphs, branch, name, label, sourceForm, sourceName) {
  if (!paragraphs.length || !name) return;
  blocks.push({
    id: `known-words-${blocks.length}`,
    type: 'knownWords',
    name,
    paragraphs,
    label,
    sourceForm,
    sourceName,
    ...(branch ? { branch } : {}),
  });
}

function normalizeTextBlockSequence(blocks) {
  const normalized = [];
  for (const block of blocks) {
    if (block.type === 'link' && block.inline) {
      const previous = normalized[normalized.length - 1];
      if (previous?.type === 'text' && previous.branch === block.branch && block.text && block.href) {
        previous.text = `${previous.text} ${normalizeTextBlockText(block.text)}`;
        previous.links = [...(previous.links || []), { text: normalizeTextBlockText(block.text), href: resolveTemplateHref(block.href) }];
        continue;
      }
      normalized.push({
        id: `text-${block.id}`,
        type: 'text',
        text: normalizeTextBlockText(block.text),
        links: [{ text: normalizeTextBlockText(block.text), href: resolveTemplateHref(block.href) }],
        ...(block.branch ? { branch: block.branch } : {}),
      });
      continue;
    }

    if (block.type !== 'text') {
      normalized.push(block);
      continue;
    }

    let text = stripGenericNextScheduleInstruction(normalizeTextBlockText(block.text));
    if (!text || (isOptionalStep1Note(text) && !Array.isArray(block.content))) continue;

    const previous = normalized[normalized.length - 1];
    const leadingPunctuation = text.match(/^([.!?,;:]+)\s+([\s\S]+)$/);
    if (leadingPunctuation && previous?.type === "text" && previous.branch === block.branch) {
      previous.text = `${previous.text}${leadingPunctuation[1]}`;
      text = leadingPunctuation[2].trim();
      if (!text || isOptionalStep1Note(text)) continue;
    }

    if (/^Отвечайте\s+🇷🇺\s+по-русски\.?$/i.test(text)) {
      let joined = false;
      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const candidate = normalized[index];
        if (candidate.type !== 'text') break;
        if (candidate.branch !== 'advanced' && candidate.branch !== 'beginner-medium') continue;
        candidate.text = `${candidate.text} ${text.replace(/\.$/, '')}`;
        joined = true;
      }
      if (joined) continue;
    }

    if (shouldJoinWithPrevious(previous, text) && previous?.type === 'text' && previous.branch === block.branch) {
      const isStandalonePunctuation = /^[.!?,;:)\]}>»]+$/.test(text);
      const startsWithClosingPunctuation = /^[)\]}>»]/.test(text);
      const separator = isStandalonePunctuation || startsWithClosingPunctuation ? '' : ' ';
      const appendedText = isStandalonePunctuation ? text : text.replace(/\.$/, '');
      previous.text = `${previous.text}${separator}${appendedText}`;
      if (Array.isArray(block.links) && block.links.length) {
        previous.links = [...(previous.links || []), ...block.links];
      }
      if (Array.isArray(block.content) && block.content.length) {
        previous.content = [...(previous.content || []), ...block.content];
      }
      continue;
    }

    if (/^[.!?,;:]+$/.test(text)) continue;
    normalized.push({ ...block, text });
  }
  return normalized;
}

function renderTemplateBlocks(templatePath, fields, templatesRoot, folder) {
  let html = fs.readFileSync(templatePath, 'utf8')
    .replace(/\{#[\s\S]*?#\}/g, '\n');
  html = legacyTableRowsToTags(html);
  const tokenPattern = /(\{%[\s\S]*?%\}|<\/?[A-Za-z][^>]*>)/g;
  const blocks = [];
  const stack = [];
  const listStack = [];
  let lastIndex = 0;
  let match;

  const activeBlocks = () => {
    const activeList = listStack[listStack.length - 1];
    return activeList?.currentItem?.blocks || blocks;
  };
  const pushBlock = (block) => activeBlocks().push(block);
  const appendText = (text) => {
    const branch = currentBranch(stack);
    const runMeta = currentInlineRun(stack);
    if (runMeta.href || runMeta.marks || runMeta.tone) {
      pushRichTextBlock(activeBlocks(), text, branch, runMeta);
      return;
    }
    pushTextBlock(activeBlocks(), text, branch);
  };

  while ((match = tokenPattern.exec(html)) !== null) {
    appendText(html.slice(lastIndex, match.index));
    const token = match[0];

    const video = token.match(/^\{%\s*video\s+['"]([^'"]+)['"]\s*%\}$/);
    const audio = token.match(/^\{%\s*audio\s+['"]([^'"]+)['"]\s*%\}$/);
    const radio = token.match(/^\{%\s*(radio_[A-Za-z0-9_]+)\s*%\}$/);
    const field = token.match(/^\{%\s*render_field\s+form\.([A-Za-z0-9_]+)[^%]*%\}$/);
    const loadAnswer = token.match(/^\{%\s*load_answer\s+([\s\S]*?)%\}$/);
    const branch = currentBranch(stack);
    if (video) {
      pushBlock({ id: `video-${activeBlocks().length}`, type: 'video', code: video[1], ...(branch ? { branch } : {}) });
    } else if (audio) {
      pushBlock({ id: `audio-${activeBlocks().length}`, type: 'audio', code: audio[1], ...(branch ? { branch } : {}) });
    } else if (radio) {
      const stations = radioStationsForTag(radio[1]);
      if (stations.length) pushBlock({ id: `radio-${activeBlocks().length}`, type: 'radio', stations, ...(branch ? { branch } : {}) });
    } else if (field) {
      const block = fieldBlock(field[1], fields[field[1]], branch, activeBlocks().length);
      if (block) pushBlock(block);
    } else if (loadAnswer) {
      const [sourceForm, sourceName] = parseTemplateTagArgs(loadAnswer[1]);
      const targetName = sourceName ? `known_words${blocks.filter((block) => block.type === 'knownWords').length + 1}` : '';
      const paragraphs = sourceForm && sourceName
        ? extractLegacyKnownWordsParagraphs(templatesRoot, folder, sourceForm, sourceName)
        : [];
      pushKnownWordsBlock(activeBlocks(), paragraphs, branch, targetName, targetName ? `Текст ${targetName.replace(/^known_words/, '')}` : '', sourceForm, sourceName);
    } else if (token.startsWith('{%')) {
      // Other Django tags control template flow/includes and are not user-visible blocks.
    } else {
      const close = token.match(/^<\/([A-Za-z0-9-]+)>/);
      const open = token.match(/^<([A-Za-z0-9-]+)\b([^>]*)>/);
      if (close) {
        const tag = close[1].toLowerCase();
        if (tag === 'li') {
          const currentList = listStack[listStack.length - 1];
          if (currentList?.currentItem) {
            const item = listItemFromBlocks(currentList.currentItem.blocks);
            if (item.text || item.blocks?.length) currentList.block.items.push(item);
            currentList.currentItem = null;
          }
        } else if (tag === 'ol' || tag === 'ul') {
          listStack.pop();
        }
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          const item = stack.pop();
          if (item.tag === tag) break;
        }
      } else if (open && !/\/\s*>$/.test(token)) {
        const tag = open[1].toLowerCase();
        const attrs = open[2];
        const classMatch = attrs.match(/class=["']([^"']+)["']/i);
        const hrefMatch = attrs.match(/href=(["'])([\s\S]*?)\1/i);
        if (tag === 'img') {
          pushImageBlock(activeBlocks(), attrs, branch);
        } else if (tag === 'legacy-table-row') {
          const fieldName = htmlAttr(attrs, 'data-field');
          const rowPrefix = stripHtmlToText(htmlAttr(attrs, 'data-prefix'));
          const rowSuffix = stripHtmlToText(htmlAttr(attrs, 'data-suffix'));
          const block = fieldBlock(fieldName, fields[fieldName], branch, activeBlocks().length, {
            rowLayout: 'three-column',
            rowPrefix,
            rowSuffix,
          });
          if (block) pushBlock(block);
        } else if (tag === 'ol' || tag === 'ul') {
          const listBlock = { id: `list-${activeBlocks().length}`, type: 'list', ordered: tag === 'ol', items: [], ...(branch ? { branch } : {}) };
          pushBlock(listBlock);
          listStack.push({ block: listBlock, currentItem: null });
          stack.push({ tag, branch: branchFromClass(classMatch ? classMatch[1] : ''), ...inlineMetaFromTag(tag, attrs) });
        } else if (tag === 'li') {
          let currentList = listStack[listStack.length - 1];
          if (!currentList) {
            const listBlock = { id: `list-${activeBlocks().length}`, type: 'list', ordered: false, items: [], ...(branch ? { branch } : {}) };
            pushBlock(listBlock);
            currentList = { block: listBlock, currentItem: null, implicit: true };
            listStack.push(currentList);
          }
          currentList.currentItem = { blocks: [] };
          stack.push({ tag, branch: branchFromClass(classMatch ? classMatch[1] : ''), ...inlineMetaFromTag(tag, attrs) });
        } else {
          stack.push({
            tag,
            branch: branchFromClass(classMatch ? classMatch[1] : ''),
            href: tag === 'a' && hrefMatch ? resolveTemplateHref(hrefMatch[2]) : null,
            ...inlineMetaFromTag(tag, attrs),
          });
        }
      }
    }
    lastIndex = tokenPattern.lastIndex;
  }
  appendText(html.slice(lastIndex));

  return normalizeTextBlockSequence(blocks);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function blocksToText(blocks) {
  const parts = [];
  for (const block of blocks) {
    if (block.type === 'text') parts.push(block.text);
    else if (block.type === 'video') parts.push(`Видео: ${block.code}`);
    else if (block.type === 'audio') parts.push(`Аудио: ${block.code}`);
    else if (block.type === 'radio') parts.push(`Радио: ${(block.stations || []).map((station) => station.label).join('; ')}`);
    else if (block.type === 'list') parts.push(...(block.items || []).map(listItemPlainText).filter(Boolean));
    else if (block.type === 'link') parts.push(block.text);
    else if (block.type === 'image' && block.alt) parts.push(block.alt);
    else if (block.type === 'knownWords') {
      if (block.label) parts.push(block.label);
      parts.push(...block.paragraphs);
    }
    else if (block.type === 'field') {
      const label = block.rowLayout === 'three-column'
        ? [block.rowPrefix, block.label, block.rowSuffix].filter(Boolean).join(' ')
        : block.label;
      const fieldParts = [`Вопрос: ${label}`];
      if (Array.isArray(block.choices) && block.choices.length) {
        fieldParts.push(`Варианты: ${block.choices.map((choice) => choice.label).join('; ')}`);
      }
      if (block.required === false) fieldParts.push('Необязательное поле.');
      parts.push(fieldParts.join('\n'));
    }
  }
  return cleanText(parts.join('\n\n'));
}

function legacyFolderForStep(step) {
  const fromSocialLink = String(step.socialLink || '').match(/\/marathon\/([^/?#]+)\/?/i);
  if (fromSocialLink) return fromSocialLink[1].toLowerCase();
  return LANGUAGE_FOLDERS[String(step.marathon.languageCode || '').toLowerCase()] || null;
}

function loadLegacyForms(legacyRoot) {
  const python = String.raw`
import ast, json, os, sys

legacy_root = sys.argv[1]
steps_root = os.path.join(legacy_root, "marathon", "steps")

def const_string(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left = const_string(node.left)
        right = const_string(node.right)
        if left is not None and right is not None:
            return left + right
    return None

def strings_from_sequence(node):
    if not isinstance(node, (ast.Tuple, ast.List)):
        return []
    result = []
    for item in node.elts:
        value = const_string(item)
        if value:
            result.append(value)
    return result

def choices_from_tuple(node):
    if not isinstance(node, (ast.Tuple, ast.List)):
        return []
    result = []
    for item in node.elts:
        if isinstance(item, (ast.Tuple, ast.List)) and len(item.elts) >= 2:
            value = const_string(item.elts[0])
            label = const_string(item.elts[1])
            if label:
                result.append({"value": value or label, "label": label})
    return result

def call_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Call):
        return call_name(node.func)
    return ""

def parse_forms(file_path):
    module = ast.parse(open(file_path, encoding="utf-8").read())
    forms = {}
    for cls in [node for node in module.body if isinstance(node, ast.ClassDef)]:
        constants = {}
        fields = {}
        for stmt in cls.body:
            if not isinstance(stmt, ast.Assign) or len(stmt.targets) != 1 or not isinstance(stmt.targets[0], ast.Name):
                continue
            name = stmt.targets[0].id
            if name.isupper():
                constants[name] = choices_from_tuple(stmt.value)
                continue
            if not isinstance(stmt.value, ast.Call):
                continue
            kwargs = {kw.arg: kw.value for kw in stmt.value.keywords if kw.arg}
            label = const_string(kwargs.get("label")) if "label" in kwargs else ""
            choices = []
            if "choices" in kwargs:
                choice_node = kwargs["choices"]
                if isinstance(choice_node, ast.Name):
                    choices = constants.get(choice_node.id, [])
                else:
                    choices = choices_from_tuple(choice_node)
            correct_answers = strings_from_sequence(kwargs.get("answers")) if "answers" in kwargs else []
            required = True
            if "required" in kwargs and isinstance(kwargs["required"], ast.Constant):
                required = bool(kwargs["required"].value)
            widget_name = call_name(kwargs.get("widget")) if "widget" in kwargs else ""
            field_call = call_name(stmt.value.func)
            if field_call == "MdlRadioField":
                field_type = "radio"
            elif field_call == "MultipleChoiceField" or widget_name == "CheckboxMultiple":
                field_type = "checkbox"
            elif widget_name == "MdlTextarea":
                field_type = "textarea"
            else:
                field_type = "text"
            fields[name] = {
                "label": label or name,
                "choices": choices,
                "required": required,
                "fieldType": field_type,
                "correctAnswers": correct_answers,
                "hidden": widget_name == "HiddenInput" or name.startswith("known_words"),
            }
        if fields:
            forms[cls.name] = fields
    return forms

out = {}
for folder in sorted(os.listdir(steps_root)):
    forms_py = os.path.join(steps_root, folder, "forms.py")
    if os.path.exists(forms_py):
        out[folder] = parse_forms(forms_py)
print(json.dumps(out, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-c', python, legacyRoot], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`Legacy form parse failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!fs.existsSync(opts.legacyRoot)) throw new Error(`Legacy root not found: ${opts.legacyRoot}`);

  const templatesRoot = path.join(opts.legacyRoot, 'marathon', 'templates', 'marathon', 'steps');
  const legacyForms = opts.formsJson
    ? JSON.parse(fs.readFileSync(opts.formsJson, 'utf8'))
    : loadLegacyForms(opts.legacyRoot);
  if (opts.dumpFormsJson) {
    fs.writeFileSync(opts.dumpFormsJson, `${JSON.stringify(legacyForms, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ formsJson: opts.dumpFormsJson }, null, 2)}\n`);
    return;
  }
  const prisma = new PrismaClient();
  const stepWhere = {
    ...(opts.sequence ? { sequence: Number(opts.sequence) } : {}),
    ...(opts.formKey ? { formKey: opts.formKey } : {}),
    ...(opts.languageCode ? { marathon: { languageCode: opts.languageCode } } : {}),
  };
  const steps = await prisma.marathonStep.findMany({
    where: stepWhere,
    include: { marathon: { select: { languageCode: true, slug: true } } },
    orderBy: [{ marathonId: 'asc' }, { sequence: 'asc' }],
  });

  const summary = { checked: steps.length, generated: 0, changed: 0, skipped: 0, missing: [] };
  const updates = [];

  for (const step of steps) {
    if (!step.formKey) {
      summary.skipped += 1;
      continue;
    }
    const folder = legacyFolderForStep(step);
    const templatePath = folder ? path.join(templatesRoot, folder, `${step.formKey}.html`) : '';
    const fields = folder ? legacyForms[folder]?.[step.formKey] : null;
    if (!folder || !fields || !fs.existsSync(templatePath)) {
      summary.missing.push({ id: step.id, title: step.title, languageCode: step.marathon.languageCode, formKey: step.formKey, folder });
      continue;
    }
    const blocks = renderTemplateBlocks(templatePath, fields, templatesRoot, folder);
    const content = blocksToText(blocks);
    summary.generated += 1;
    const currentBlocks = Array.isArray(step.assignmentBlocks) ? stableJson(step.assignmentBlocks) : '';
    if (content && (content !== (step.assignmentContent || '').trim() || stableJson(blocks) !== currentBlocks)) {
      summary.changed += 1;
      updates.push({ id: step.id, title: step.title, languageCode: step.marathon.languageCode, formKey: step.formKey, content, blocks });
    }
  }

  if (opts.apply) {
    for (const update of updates) {
      await prisma.marathonStep.update({
        where: { id: update.id },
        data: { assignmentContent: update.content, assignmentBlocks: update.blocks },
      });
    }
  }

  await prisma.$disconnect();
  process.stdout.write(`${JSON.stringify({
    mode: opts.apply ? 'apply' : 'dry-run',
    ...summary,
    updated: opts.apply ? updates.length : 0,
    filters: {
      ...(opts.sequence ? { sequence: Number(opts.sequence) } : {}),
      ...(opts.formKey ? { formKey: opts.formKey } : {}),
      ...(opts.languageCode ? { languageCode: opts.languageCode } : {}),
    },
    examples: updates.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      languageCode: item.languageCode,
      formKey: item.formKey,
      chars: item.content.length,
      blocks: item.blocks.length,
    })),
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
