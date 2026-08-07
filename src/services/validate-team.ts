export interface TeamValidationInput {
  teamName: string;
  textifiedName: string;
  captainId: string;
  memberIds: string[];
  requestingUserId: string;
  isRequesterAdmin: boolean;
  existingRoleNames: string[];
  existingChannelNames: string[];
  botUserIds: string[];
  adminUserIds: string[];
  aliasMatch: string | null;
  memberConflicts: { userId: string; teamName: string }[];
}

export type ValidationError =
  | { type: "not_self_registering" }
  | { type: "duplicate_role"; names: string[] }
  | { type: "duplicate_channel"; names: string[] }
  | { type: "alias_collision"; existingTeam: string }
  | { type: "members_already_registered"; conflicts: { userId: string; teamName: string }[] }
  | { type: "admin_members"; userIds: string[] }
  | { type: "bot_members"; userIds: string[] };

export function validateTeamRegistration(input: TeamValidationInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.memberIds.includes(input.requestingUserId) && !input.isRequesterAdmin) {
    errors.push({ type: "not_self_registering" });
  }

  const nameLower = input.teamName.toLowerCase();
  const roleNameWithPrefix = `team: ${nameLower}`;
  const dupedRoles = input.existingRoleNames.filter(
    (r) => r.toLowerCase() === nameLower || r.toLowerCase() === roleNameWithPrefix
  );
  if (dupedRoles.length > 0) {
    errors.push({ type: "duplicate_role", names: dupedRoles });
  }

  const channelNameDashed = nameLower.replaceAll(" ", "-");
  const textLower = input.textifiedName.toLowerCase();
  const dupedChannels = input.existingChannelNames.filter((ch) => {
    const chLower = ch.toLowerCase();
    return chLower === nameLower || chLower === channelNameDashed || chLower === textLower;
  });
  if (dupedChannels.length > 0) {
    errors.push({ type: "duplicate_channel", names: dupedChannels });
  }

  if (input.aliasMatch) {
    errors.push({ type: "alias_collision", existingTeam: input.aliasMatch });
  }

  if (input.memberConflicts.length > 0) {
    errors.push({ type: "members_already_registered", conflicts: input.memberConflicts });
  }

  const adminMembers = input.memberIds.filter((id) => input.adminUserIds.includes(id));
  if (adminMembers.length > 0) {
    errors.push({ type: "admin_members", userIds: adminMembers });
  }

  const botMembers = input.memberIds.filter((id) => input.botUserIds.includes(id));
  if (botMembers.length > 0) {
    errors.push({ type: "bot_members", userIds: botMembers });
  }

  return errors;
}
