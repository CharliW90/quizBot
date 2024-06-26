const { setTeamsAliases, getTeamsAliases, deleteTeamsAliases, lookupAlias, setTeamsMembers, getTeamsMembers, deleteTeamsMembers, checkMembers, reset } = require("./maps");
const { recordTeam, getTeam, deleteTeam, indexQuizzes, indexTeams } = require("./quiz");
const { addResponseToFirestore, getResponseFromFirestore, checkHistory, revertHistory, indexRounds } = require("./responses");
const { addScoreboardToFirestore, getScoreboardFromFirestore } = require("./scoreboard");
const { addScoreToFirestoreTeam } = require("./scores");
const { addUserToFirestore, getUserFromFirestore, getUserTeamNames } = require("./users");

module.exports = {
  setTeamsAliases,
  getTeamsAliases,
  deleteTeamsAliases,
  lookupAlias,
  setTeamsMembers,
  getTeamsMembers,
  deleteTeamsMembers,
  checkMembers,
  reset,
  recordTeam,
  getTeam,
  deleteTeam,
  indexQuizzes,
  indexTeams,
  addResponseToFirestore,
  getResponseFromFirestore,
  checkHistory,
  revertHistory,
  indexRounds,
  addScoreboardToFirestore,
  getScoreboardFromFirestore,
  addScoreToFirestoreTeam,
  addUserToFirestore,
  getUserFromFirestore,
  getUserTeamNames
}