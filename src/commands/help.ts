import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";

interface CommandEntry {
  name: string;
  summary: string;
  usage: string;
  detail: string;
  admin?: boolean;
}

const commands: CommandEntry[] = [
  {
    name: "register",
    summary: "Create a team",
    usage: "/register <name> <captain> <members...> [color]",
    detail:
      "Creates a role, text channel, and voice channel for the team. " +
      "The captain can manage the roster afterwards with /team. " +
      "Color is an optional hex code for the team's role.",
  },
  {
    name: "team",
    summary: "Manage team roster",
    usage: "/team <add-member|remove-member|promote-to-captain> <team> <user>",
    detail:
      "add-member and remove-member do what they say. " +
      "promote-to-captain transfers captaincy to another member. " +
      "Requires captain on the team, or server admin.",
  },
  {
    name: "leave",
    summary: "Leave your team",
    usage: "/leave",
    detail:
      "Removes you from your team. " +
      "Captains must /team promote-to-captain first. " +
      "If you're the last member, ask an admin to /delete-team instead.",
  },
  {
    name: "delete-team",
    summary: "Delete a team",
    usage: "/delete-team <team>",
    detail:
      "Permanently removes the team's role, channels, and stored data. " +
      "You'll be asked to confirm before anything is deleted.",
    admin: true,
  },
  {
    name: "quiz-setup",
    summary: "Link a Google Form to a round",
    usage: "/quiz-setup <round> <form-id>",
    detail:
      "The form ID is the long string in the Google Form URL. " +
      "Rounds are numbered from 1. Run this once per round before the quiz starts.",
    admin: true,
  },
  {
    name: "quiz-fetch",
    summary: "Fetch responses from a form",
    usage: "/quiz-fetch <round>",
    detail:
      "Pulls answers from the linked Google Form and stores them. " +
      "Safe to re-run - picks up late submissions without losing earlier data.",
    admin: true,
  },
  {
    name: "quiz-send",
    summary: "Send results to team channels",
    usage: "/quiz-send <round> [date]",
    detail:
      "Posts each team's answers and scores to their private channel. " +
      "Defaults to today if no date given. " +
      "Teams that didn't submit are flagged. " +
      "Use /quiz-correct first if there are name typos.",
    admin: true,
  },
  {
    name: "quiz-scoreboard",
    summary: "Post the leaderboard",
    usage: "/quiz-scoreboard [date]",
    detail:
      "Calculates cumulative scores across all fetched rounds and " +
      "posts the leaderboard to the current channel. Visible to everyone. " +
      "Defaults to today if no date given. Historic scoreboards are read-only.",
    admin: true,
  },
  {
    name: "quiz-correct",
    summary: "Fix a team name typo",
    usage: "/quiz-correct <incorrect> <correct>",
    detail:
      "Fixes a misspelled team name in form responses. " +
      "Updates all stored rounds and saves an alias so future fetches auto-correct. " +
      "Better than asking the team to resubmit.",
    admin: true,
  },
  {
    name: "quiz-end",
    summary: "End a quiz session",
    usage: "/quiz-end [date]",
    detail:
      "Closes a quiz session. No more fetches or sends after this. " +
      "Defaults to today if no date given. Warns if no scoreboard has been generated yet. " +
      "Run this before /quiz-reset if you want to preserve final scores.",
    admin: true,
  },
  {
    name: "quiz-reset",
    summary: "Wipe all teams and quiz data",
    usage: "/quiz-reset",
    detail:
      "Nuclear option. Scans the server for team roles and channels and deletes them all. " +
      "Also clears Firestore data for today's active quiz. " +
      "Not reversible. You'll be asked to confirm.",
    admin: true,
  },
  {
    name: "ping",
    summary: "Check latency",
    usage: "/ping",
    detail: "Shows round-trip and WebSocket latency.",
  },
  {
    name: "help",
    summary: "Show this list, or detail for a command",
    usage: "/help [command]",
    detail: "Without an argument, lists all commands. With a command name, shows detailed usage.",
  },
];

function buildIndex(isAdmin: boolean): string {
  const visible = commands.filter((c) => isAdmin || !c.admin);
  const maxName = Math.max(...visible.map((c) => c.name.length));
  const lines = visible.map((c) => `  /${c.name.padEnd(maxName)}  ${c.summary}`);
  return "```\nQuizBot v4.0.0\n\n" + lines.join("\n") + "\n```";
}

function buildDetail(entry: CommandEntry): string {
  return "```\n" + `${entry.usage}\n\n  ${entry.detail}` + "\n```";
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands, or detail for a specific command")
    .addStringOption((opt) =>
      opt.setName("command").setDescription("Command to get help for").setAutocomplete(true),
    )
    .setDMPermission(false) as SlashCommandBuilder,

  async autocomplete(interaction: AutocompleteInteraction) {
    const member = interaction.member as GuildMember;
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);
    const focused = interaction.options.getFocused().toLowerCase();
    const visible = commands.filter((c) => isAdmin || !c.admin);
    const matches = visible
      .filter((c) => c.name.includes(focused))
      .map((c) => ({ name: c.name, value: c.name }));
    await interaction.respond(matches.slice(0, 25));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);
    const target = interaction.options.getString("command");

    if (target) {
      const entry = commands.find((c) => c.name === target);
      if (!entry || (entry.admin && !isAdmin)) {
        await interaction.reply({
          content: `Unknown command: ${target}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.reply({ content: buildDetail(entry), flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({ content: buildIndex(isAdmin), flags: MessageFlags.Ephemeral });
  },
};

export default command;
