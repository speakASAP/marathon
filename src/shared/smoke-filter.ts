export const SMOKE_PARTICIPANT_NAME_PREFIX = "Marathon Prod Smoke";
export const SMOKE_GIFT_CODE_PREFIX = "SMOKE-";

export const smokeParticipantWhere = {
  name: { startsWith: SMOKE_PARTICIPANT_NAME_PREFIX },
};

const nonSmokeParticipantWhere = {
  OR: [
    { name: null },
    { name: { not: { startsWith: SMOKE_PARTICIPANT_NAME_PREFIX } } },
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
