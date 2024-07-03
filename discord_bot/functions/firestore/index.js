const { setTeamsAliases, getTeamsAliases, deleteTeamsAliases, lookupAlias, setTeamsMembers, getTeamsMembers, deleteTeamsMembers, checkMembers, reset } = require("./maps");
const { recordTeam, getTeam, deleteTeam, indexQuizzes, indexTeams, endQuiz } = require("./quiz");
const { addResponseToFirestore, getResponseFromFirestore, indexRounds, indexResponsesTeams, correctResponseInFirestore } = require("./responses");
const { addScoreboardToFirestore, getScoreboardFromFirestore } = require("./scoreboard");
const { addScoreToFirestoreTeam } = require("./scores");
const { addTeamMemberToFirestore, postScoreToUser, getUserFromFirestore, getUserTeamNames } = require("./users");

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
  endQuiz,
  addResponseToFirestore,
  getResponseFromFirestore,
  indexRounds,
  indexResponsesTeams,
  correctResponseInFirestore,
  addScoreboardToFirestore,
  getScoreboardFromFirestore,
  addScoreToFirestoreTeam,
  addTeamMemberToFirestore,
  postScoreToUser,
  getUserFromFirestore,
  getUserTeamNames
}