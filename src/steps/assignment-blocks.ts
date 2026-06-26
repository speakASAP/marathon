export type AssignmentBranch = 'beginner' | 'medium' | 'advanced' | 'beginner-medium';

export type AssignmentChoice = {
  value: string;
  label: string;
};

export type AssignmentTextBlock = {
  id: string;
  type: 'text';
  text: string;
  branch?: AssignmentBranch;
};

export type AssignmentVideoBlock = {
  id: string;
  type: 'video';
  code: string;
  title?: string;
  branch?: AssignmentBranch;
};

export type AssignmentAudioBlock = {
  id: string;
  type: 'audio';
  code: string;
  title?: string;
  branch?: AssignmentBranch;
};

export type AssignmentFieldBlock = {
  id: string;
  type: 'field';
  name: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'checkbox';
  required: boolean;
  choices?: AssignmentChoice[];
  branch?: AssignmentBranch;
};

export type AssignmentBlock = AssignmentTextBlock | AssignmentVideoBlock | AssignmentAudioBlock | AssignmentFieldBlock;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBranch(value: unknown): AssignmentBranch | undefined {
  if (value === 'beginner' || value === 'medium' || value === 'advanced' || value === 'beginner-medium') {
    return value;
  }
  return undefined;
}

function normalizeChoices(value: unknown): AssignmentChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice) => {
      if (!isRecord(choice)) return null;
      const label = cleanString(choice.label);
      const rawValue = cleanString(choice.value) || label;
      if (!label || !rawValue) return null;
      return { value: rawValue, label };
    })
    .filter((choice): choice is AssignmentChoice => Boolean(choice));
}

export function normalizeAssignmentBlocks(value: unknown): AssignmentBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index): AssignmentBlock | null => {
      if (!isRecord(raw)) return null;
      const type = raw.type;
      const branch = normalizeBranch(raw.branch);
      const id = cleanString(raw.id) || `block-${index}`;

      if (type === 'text') {
        const text = cleanString(raw.text);
        return text ? { id, type, text, ...(branch ? { branch } : {}) } : null;
      }

      if (type === 'video') {
        const code = cleanString(raw.code);
        if (!/^[\w-]{6,}$/.test(code)) return null;
        const title = cleanString(raw.title);
        return { id, type, code, ...(title ? { title } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'audio') {
        const code = cleanString(raw.code);
        if (!code) return null;
        const title = cleanString(raw.title);
        return { id, type, code, ...(title ? { title } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'field') {
        const name = cleanString(raw.name);
        const label = cleanString(raw.label) || name;
        const fieldType = raw.fieldType === 'radio' || raw.fieldType === 'checkbox' || raw.fieldType === 'textarea' ? raw.fieldType : 'text';
        if (!name || !label) return null;
        return {
          id,
          type,
          name,
          label,
          fieldType,
          required: raw.required !== false,
          choices: normalizeChoices(raw.choices),
          ...(branch ? { branch } : {}),
        };
      }

      return null;
    })
    .filter((block): block is AssignmentBlock => Boolean(block));
}
