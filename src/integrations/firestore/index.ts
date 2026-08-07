export { getDb } from "./client.js";
export { createTeam, getTeam, listTeams, deleteTeam, updateTeam } from "./teams.js";
export { createQuiz, getQuiz, listQuizzes, endQuiz, checkQuizNotEnded } from "./quiz.js";
export { storeRound, getRound, listRounds, publishRound } from "./rounds.js";
export { setAlias, getAliases, lookupAlias, deleteAliasesForTeam } from "./aliases.js";
export { setTeamMembers, getTeamMembers, checkMembersRegistered, deleteTeamMembers } from "./members.js";
export { addTeamMember, getUserTeamNames } from "./users.js";
export { addScoreboard, getScoreboard } from "./scoreboard.js";
export { getFormIds, setFormId } from "./guild-config.js";

export type { Team } from "./teams.js";
export type { Quiz } from "./quiz.js";
export type { RoundData, TeamResponse, Answer, HistoryEntry } from "./rounds.js";
export type { UserRecord, UserGuildRecord } from "./users.js";
export type { ScoreboardEntry, Scoreboard } from "./scoreboard.js";
export type { FormIds, SetFormIdResult } from "./guild-config.js";
