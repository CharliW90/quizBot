import type { firestore } from "firebase-admin";
import type {
  CategoryChannel,
  Guild,
  GuildMember,
  PermissionOverwriteOptions,
  Role,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { ok, err, type Result } from "../utils/result.js";
import { textifyTeamName } from "../utils/textify.js";
import { createTeam } from "../integrations/firestore/teams.js";
import { setTeamMembers } from "../integrations/firestore/members.js";
import { setAlias } from "../integrations/firestore/aliases.js";
import { addTeamMember } from "../integrations/firestore/users.js";
import { logger } from "../utils/logger.js";

export interface RegisterTeamInput {
  teamName: string;
  captain: GuildMember;
  members: GuildMember[];
  color: number;
}

export interface RegisterTeamContext {
  guild: Guild;
  db: firestore.Firestore;
  quizDate: string;
  botRoleName: string;
  categoryName: string;
}

export interface RegistrationResult {
  role: Role;
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;
  textifiedName: string;
}

type Undoable =
  | { type: "role"; resource: Role }
  | { type: "channel"; resource: TextChannel | VoiceChannel };

export async function registerTeam(
  input: RegisterTeamInput,
  ctx: RegisterTeamContext
): Promise<Result<RegistrationResult>> {
  const history: Undoable[] = [];
  const allMembers = [input.captain, ...input.members];
  const allMemberIds = allMembers.map((m) => m.id);
  const textifiedName = textifyTeamName(input.teamName);

  try {
    // 1. Create team role
    const role = await ctx.guild.roles.create({
      name: `Team: ${input.teamName}`,
      color: input.color,
      hoist: true,
      mentionable: true,
    });
    history.push({ type: "role", resource: role });

    // 2. Assign roles
    const teamsRole = ctx.guild.roles.cache.find((r) => r.name === "Teams");
    const captainRole = ctx.guild.roles.cache.find((r) => r.name === "Team Captain");

    const roleAssignments = allMembers.map((m) => m.roles.add(role));
    if (teamsRole) {
      roleAssignments.push(...allMembers.map((m) => m.roles.add(teamsRole)));
    }
    if (captainRole) {
      roleAssignments.push(input.captain.roles.add(captainRole));
    }
    await Promise.all(roleAssignments);

    // 3. Find category
    const category = ctx.guild.channels.cache.find(
      (ch) => ch.name === ctx.categoryName && ch.type === ChannelType.GuildCategory
    ) as CategoryChannel | undefined;

    if (!category) {
      await undo(history);
      return err(`Category "${ctx.categoryName}" not found`);
    }

    // 4. Build channel permissions
    const botRole = ctx.guild.roles.cache.find((r) => r.name === ctx.botRoleName);
    const permissionOverwrites = [
      { id: ctx.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: role.id, allow: [PermissionFlagsBits.ViewChannel] },
      ...(botRole ? [{ id: botRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
    ];

    // 5. Create text channel
    const textChannel = await ctx.guild.channels.create({
      name: textifiedName,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites,
    });
    history.push({ type: "channel", resource: textChannel as TextChannel });

    // 6. Create voice channel
    const voiceChannel = await ctx.guild.channels.create({
      name: input.teamName,
      type: ChannelType.GuildVoice,
      parent: category,
      permissionOverwrites,
    });
    history.push({ type: "channel", resource: voiceChannel as VoiceChannel });

    // 7. Firestore: create team record
    const teamResult = await createTeam(ctx.db, ctx.guild.id, ctx.quizDate, {
      name: input.teamName,
      captain: input.captain.id,
      members: allMemberIds,
      roleId: role.id,
      textChannelId: textChannel.id,
      voiceChannelId: voiceChannel.id,
      color: String(input.color),
    });
    if (!teamResult.ok) {
      await undo(history);
      return teamResult;
    }

    // 8. Firestore: set alias if textified name differs
    if (textifiedName !== input.teamName.toLowerCase()) {
      await setAlias(ctx.db, ctx.guild.id, ctx.quizDate, textifiedName, input.teamName.toLowerCase());
    }

    // 9. Firestore: set members map
    await setTeamMembers(ctx.db, ctx.guild.id, ctx.quizDate, input.teamName.toLowerCase(), allMemberIds);

    // 10. Firestore: add each member to user tracking
    const userWrites = allMembers.map((m) =>
      addTeamMember(
        ctx.db,
        m.id,
        m.user.username,
        m.displayName,
        ctx.guild.id,
        ctx.guild.name,
        ctx.guild.ownerId,
        input.teamName
      )
    );
    await Promise.all(userWrites);

    return ok({
      role,
      textChannel: textChannel as TextChannel,
      voiceChannel: voiceChannel as VoiceChannel,
      textifiedName,
    });
  } catch (error) {
    logger.error({ error }, "Registration failed - rolling back");
    await undo(history);
    const message = error instanceof Error ? error.message : "Registration failed";
    return err(message);
  }
}

async function undo(history: Undoable[]): Promise<void> {
  for (const entry of history.reverse()) {
    try {
      await entry.resource.delete();
    } catch (undoError) {
      logger.error({ undoError, type: entry.type }, "Rollback step failed");
    }
  }
}
