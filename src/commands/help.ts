import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";

const HEADER = `QUIZBOT(1)                   Quiz Commands Manual                   QUIZBOT(1)

NAME
    QuizBot - Discord bot for managing pub quiz teams, rounds, and scores`;

const PLAYER_SYNOPSIS = `
SYNOPSIS
    /register <name> <captain> <members...> [color]
    /team <add-member|remove-member|promote-to-captain> <team> <user>
    /leave
    /ping
    /help`;

const ADMIN_SYNOPSIS = `
SYNOPSIS
    /register <name> <captain> <members...> [color]
    /team <add-member|remove-member|promote-to-captain> <team> <user>
    /leave
    /delete-team <team>
    /quiz-setup <round> <form-id>
    /quiz-fetch <round>
    /quiz-send <round>
    /quiz-scoreboard
    /quiz-correct <incorrect> <correct>
    /quiz-end
    /quiz-reset
    /ping
    /help`;

const GETTING_STARTED_PLAYER = `
GETTING STARTED
    1. An admin sets up the quiz rounds and links the Google Forms
    2. Players form teams with /register (creates a role + private channel)
    3. Teams submit answers via Google Forms (linked externally)
    4. After each round, results are posted to your team's private channel
    5. At the end, a leaderboard is posted for everyone to see`;

const GETTING_STARTED_ADMIN = `
GETTING STARTED
    1. Set up rounds by linking Google Forms with /quiz-setup
    2. Players form teams with /register (creates a role + private channel)
    3. Teams submit answers via Google Forms (linked externally)
    4. Fetch results with /quiz-fetch, send to teams with /quiz-send
    5. Post the final leaderboard with /quiz-scoreboard`;

const TEAM_COMMANDS = `
TEAM COMMANDS
    /register <name> <captain> <members...> [color]
        Register a new team. Creates a role, text channel, and voice channel.
        The captain can later manage the team roster. Color is optional (hex).

    /team add-member <team> <user>
        Add a member to a team. Requires captain or admin.

    /team remove-member <team> <user>
        Remove a member from a team. Requires captain or admin.

    /team promote-to-captain <team> <user>
        Transfer captaincy to another team member. Requires captain or admin.

    /leave
        Leave your current team. Cannot be used by captains (promote first)
        or sole members (ask admin to delete the team).`;

const ADMIN_TEAM_COMMANDS = `
    /delete-team <team>
        Delete a team entirely: removes role, channels, and stored data.`;

const QUIZ_COMMANDS = `
QUIZ COMMANDS
    /quiz-setup <round> <form-id>
        Link a Google Form to a round number. The form ID is the long string
        in the form's URL. Rounds are numbered starting from 1.

    /quiz-fetch <round>
        Fetch responses from the linked Google Form and store them. Can be
        run multiple times to pick up late submissions.

    /quiz-send <round>
        Post each team's results to their private channel as an embed.
        Shows answers and scores per question.

    /quiz-scoreboard
        Calculate cumulative scores across all fetched rounds and post
        the leaderboard to the current channel (visible to everyone).

    /quiz-correct <incorrect-name> <correct-name>
        Fix a team name typo in form responses. Updates all stored rounds
        and saves an alias so future fetches auto-correct.

    /quiz-end
        End the current quiz session. Prevents further fetches or sends.
        Use before /quiz-reset if you want to preserve scores.

    /quiz-reset
        Nuclear option: deletes ALL teams (roles, channels, data) and
        clears the quiz session. Requires confirmation. Not reversible.`;

const UTILITY_COMMANDS = `
UTILITY COMMANDS
    /ping
        Check bot responsiveness. Shows round-trip and WebSocket latency.

    /help
        Show this manual.`;

const PLAYER_PERMISSIONS = `
PERMISSIONS
    Team management commands (/team) require captain status on the relevant
    team, or admin. All other commands listed above are open to everyone.`;

const ADMIN_PERMISSIONS = `
PERMISSIONS
    Quiz commands and /delete-team require the Manage Channels permission.
    Team management commands (/team) require captain status or admin.
    All other commands are open to everyone.`;

const WORKFLOW_TIPS = `
WORKFLOW TIPS
    - Team names in forms must match registered names (case-insensitive)
    - Use /quiz-correct to fix typos rather than asking teams to resubmit
    - /quiz-fetch is safe to re-run; it preserves history of prior fetches
    - Each server runs one quiz at a time (keyed by date)`;

const FOOTER = `
QuizBot v4.0.0                     2026                             QUIZBOT(1)`;

function buildHelp(isAdmin: boolean): string {
  const sections = [HEADER];

  if (isAdmin) {
    sections.push(ADMIN_SYNOPSIS, GETTING_STARTED_ADMIN, TEAM_COMMANDS, ADMIN_TEAM_COMMANDS, QUIZ_COMMANDS);
  } else {
    sections.push(PLAYER_SYNOPSIS, GETTING_STARTED_PLAYER, TEAM_COMMANDS);
  }

  sections.push(UTILITY_COMMANDS);
  sections.push(isAdmin ? ADMIN_PERMISSIONS : PLAYER_PERMISSIONS);

  if (isAdmin) {
    sections.push(WORKFLOW_TIPS);
  }

  sections.push(FOOTER);

  return "```\n" + sections.join("\n") + "\n```";
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show the QuizBot manual")
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);
    await interaction.reply({ content: buildHelp(isAdmin), ephemeral: true });
  },
};

export default command;
