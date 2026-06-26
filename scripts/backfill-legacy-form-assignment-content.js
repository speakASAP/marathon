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
    '  node scripts/backfill-legacy-form-assignment-content.js [--apply] [--legacy-root <path>] [--forms-json <path>]',
    '  node scripts/backfill-legacy-form-assignment-content.js --dump-forms-json <path> [--legacy-root <path>]',
    '',
    'Dry-run by default. Reads legacy Django marathon form templates and form metadata,',
    'then updates MarathonStep.assignmentContent fallback and assignmentBlocks structured JSON.',
  ].join('\n');
  (exitCode ? process.stderr : process.stdout).write(`${out}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = { apply: false, legacyRoot: DEFAULT_LEGACY_ROOT, formsJson: '', dumpFormsJson: '' };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--apply') opts.apply = true;
    else if (arg === '--legacy-root') opts.legacyRoot = args[++i];
    else if (arg === '--forms-json') opts.formsJson = args[++i];
    else if (arg === '--dump-forms-json') opts.dumpFormsJson = args[++i];
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

function fieldBlock(fieldName, field, branch, index) {
  if (!field || field.hidden || !field.label || field.label.toLowerCase() === 'text') return null;
  const choices = normalizeFirstStepPlatformChoices(
    fieldName,
    field,
    Array.isArray(field.choices)
      ? field.choices.map((choice) => ({ value: choiceValue(choice), label: choiceLabel(choice) })).filter((choice) => choice.value && choice.label)
      : [],
  );
  const fieldType = field.fieldType || (choices.length ? 'radio' : 'textarea');
  return {
    id: `field-${index}-${fieldName}`,
    type: 'field',
    name: fieldName,
    label: stripHtmlToText(field.label),
    fieldType,
    required: field.required !== false,
    choices,
    ...(branch ? { branch } : {}),
  };
}

function currentBranch(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].branch) return stack[i].branch;
  }
  return null;
}

function pushTextBlock(blocks, rawText, branch) {
  const text = stripHtmlToText(rawText);
  if (!text) return;
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

function shouldJoinWithPrevious(previous, text) {
  if (!previous || previous.type !== "text") return false;
  return /^[.!?,;:]+$/.test(text)
    || (/^настроек\.?$/i.test(text) && /^Сформируйте отчет\./i.test(previous.text))
    || isSentenceContinuation(previous.text, text);
}

function normalizeTextBlockSequence(blocks) {
  const normalized = [];
  for (const block of blocks) {
    if (block.type !== 'text') {
      normalized.push(block);
      continue;
    }

    let text = normalizeTextBlockText(block.text);
    if (!text || isOptionalStep1Note(text)) continue;

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
      previous.text = /^[.!?,;:]+$/.test(text) ? `${previous.text}${text}` : `${previous.text} ${text.replace(/\.$/, '')}`;
      continue;
    }

    if (/^[.!?,;:]+$/.test(text)) continue;
    normalized.push({ ...block, text });
  }
  return normalized;
}

function renderTemplateBlocks(templatePath, fields) {
  const html = fs.readFileSync(templatePath, 'utf8')
    .replace(/\{#[\s\S]*?#\}/g, '\n')
    .replace(/\{%\s*load_answer\s+[^%]+%\}/g, 'ранее выделенные слова');
  const tokenPattern = /(\{%[\s\S]*?%\}|<\/?[A-Za-z][^>]*>)/g;
  const blocks = [];
  const stack = [];
  let lastIndex = 0;
  let match;

  const appendText = (text) => pushTextBlock(blocks, text, currentBranch(stack));

  while ((match = tokenPattern.exec(html)) !== null) {
    appendText(html.slice(lastIndex, match.index));
    const token = match[0];

    const video = token.match(/^\{%\s*video\s+['"]([^'"]+)['"]\s*%\}$/);
    const audio = token.match(/^\{%\s*audio\s+['"]([^'"]+)['"]\s*%\}$/);
    const field = token.match(/^\{%\s*render_field\s+form\.([A-Za-z0-9_]+)[^%]*%\}$/);
    const branch = currentBranch(stack);
    if (video) {
      blocks.push({ id: `video-${blocks.length}`, type: 'video', code: video[1], ...(branch ? { branch } : {}) });
    } else if (audio) {
      blocks.push({ id: `audio-${blocks.length}`, type: 'audio', code: audio[1], ...(branch ? { branch } : {}) });
    } else if (field) {
      const block = fieldBlock(field[1], fields[field[1]], branch, blocks.length);
      if (block) blocks.push(block);
    } else if (token.startsWith('{%')) {
      // Other Django tags control template flow/includes and are not user-visible blocks.
    } else {
      const close = token.match(/^<\/([A-Za-z0-9]+)>/);
      const open = token.match(/^<([A-Za-z0-9]+)\b([^>]*)>/);
      if (close) {
        const tag = close[1].toLowerCase();
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          const item = stack.pop();
          if (item.tag === tag) break;
        }
      } else if (open && !/\/\s*>$/.test(token)) {
        const tag = open[1].toLowerCase();
        const classMatch = open[2].match(/class=["']([^"']+)["']/i);
        stack.push({ tag, branch: branchFromClass(classMatch ? classMatch[1] : '') });
      }
    }
    lastIndex = tokenPattern.lastIndex;
  }
  appendText(html.slice(lastIndex));

  return normalizeTextBlockSequence(blocks);
}

function blocksToText(blocks) {
  const parts = [];
  for (const block of blocks) {
    if (block.type === 'text') parts.push(block.text);
    else if (block.type === 'video') parts.push(`Видео: ${block.code}`);
    else if (block.type === 'audio') parts.push(`Аудио: ${block.code}`);
    else if (block.type === 'field') {
      const fieldParts = [`Вопрос: ${block.label}`];
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
  const steps = await prisma.marathonStep.findMany({
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
    const blocks = renderTemplateBlocks(templatePath, fields);
    const content = blocksToText(blocks);
    summary.generated += 1;
    const currentBlocks = Array.isArray(step.assignmentBlocks) ? JSON.stringify(step.assignmentBlocks) : '';
    if (content && (content !== (step.assignmentContent || '').trim() || JSON.stringify(blocks) !== currentBlocks)) {
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
