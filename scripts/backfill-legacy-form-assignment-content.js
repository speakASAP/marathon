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
    'Dry-run by default. Reads legacy Django marathon form templates and form labels,',
    'then updates MarathonStep.assignmentContent so assignment pages contain the full task text.',
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

function fieldText(field) {
  if (!field || field.hidden || !field.label || field.label.toLowerCase() === 'text') return '';
  const parts = [`Вопрос: ${stripHtmlToText(field.label)}`];
  if (Array.isArray(field.choices) && field.choices.length) {
    parts.push(`Варианты: ${field.choices.map((choice) => stripHtmlToText(choice)).join('; ')}`);
  }
  if (field.required === false) parts.push('Необязательное поле.');
  return parts.join('\n');
}

function renderTemplate(templatePath, fields) {
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html
    .replace(/\{%\s*video\s+['"]([^'"]+)['"]\s*%\}/g, '\nВидео: $1\n')
    .replace(/\{%\s*audio\s+['"]([^'"]+)['"]\s*%\}/g, '\nАудио: $1\n')
    .replace(/\{%\s*load_answer\s+[^%]+%\}/g, 'ранее выделенные слова')
    .replace(/\{%\s*render_field\s+form\.([A-Za-z0-9_]+)[^%]*%\}/g, (_, fieldName) => {
      const rendered = fieldText(fields[fieldName]);
      return rendered ? `\n${rendered}\n` : '\n';
    })
    .replace(/\{#[\s\S]*?#\}/g, '\n')
    .replace(/\{%\s*[^%]+%\}/g, '\n')
    .replace(/\{\{[\s\S]*?\}\}/g, '\n');

  return stripHtmlToText(html);
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
            label = const_string(item.elts[1])
            if label:
                result.append(label)
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
            fields[name] = {
                "label": label or name,
                "choices": choices,
                "required": required,
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
    const content = renderTemplate(templatePath, fields);
    summary.generated += 1;
    if (content && content !== (step.assignmentContent || '').trim()) {
      summary.changed += 1;
      updates.push({ id: step.id, title: step.title, languageCode: step.marathon.languageCode, formKey: step.formKey, content });
    }
  }

  if (opts.apply) {
    for (const update of updates) {
      await prisma.marathonStep.update({
        where: { id: update.id },
        data: { assignmentContent: update.content },
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
    })),
  }, null, 2)}\n`);
}

main().catch(async (error) => {
  process.stderr.write(`Backfill failed: ${error.message}\n`);
  process.exit(1);
});
