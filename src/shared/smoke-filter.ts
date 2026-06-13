export const SMOKE_PARTICIPANT_NAME_PREFIX = "Marathon Prod Smoke";
export const SMOKE_PARTICIPANT_EMAIL_SUFFIX = "@example.invalid";
export const LEGACY_SMOKE_PARTICIPANT_NAME = "Marathon Smoke Test";
export const SMOKE_GIFT_CODE_PREFIX = "SMOKE-";

export const smokeParticipantWhere = {
  OR: [
    { name: { startsWith: SMOKE_PARTICIPANT_NAME_PREFIX } },
    { email: { endsWith: SMOKE_PARTICIPANT_EMAIL_SUFFIX } },
    { name: LEGACY_SMOKE_PARTICIPANT_NAME },
  ],
};

const nonSmokeParticipantWhere = {
  AND: [
    {
      OR: [
        { name: null },
        {
          AND: [
            { name: { not: { startsWith: SMOKE_PARTICIPANT_NAME_PREFIX } } },
            { name: { not: LEGACY_SMOKE_PARTICIPANT_NAME } },
          ],
        },
      ],
    },
    {
      OR: [
        { email: null },
        { email: { not: { endsWith: SMOKE_PARTICIPANT_EMAIL_SUFFIX } } },
      ],
    },
  ],
};

export function excludeSmokeParticipants(where: Record<string, unknown> = {}): any {
  return {
    AND: [
      where,
      nonSmokeParticipantWhere,
    ],
  };
}

export function excludeSmokeParticipantRelation(where: Record<string, unknown> = {}): any {
  return {
    AND: [
      where,
      { participant: { is: nonSmokeParticipantWhere } },
    ],
  };
}
