const { firestore, quizDate } = require("../../database");

exports.addUserToFirestore = async (userId, serverId, serverName, roundNum, score, teamName) => {
  if(!userId || !serverId || !serverName|| !roundNum || isNaN(roundNum) || !score || isNaN(roundNum) || teamName){
    return {error: {code: 400, loc: "firestore/users.js", message: `Missing parameters - expected userId, serverId, serverName, roundNum (number), score (number), and teamName`}, response: null}
  }
  const quiz = quizDate();
  const round = `Round ${roundNum}`;

  const thisUser = firestore.collection('Users').doc(userId);
  const thisGuild = thisUser.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);

  let thisUserRecord = await thisUser.get();
  if(!thisUserRecord.exists){
    await thisUser.set({servers: {}});
    thisUserRecord = await thisUser.get();
  }

  let thisGuildRecord = await thisGuild.get();
  if(!thisGuildRecord.exists){
    await thisGuild.set({teams: []});
    thisGuildRecord = await thisGuild.get();
  }

  let thisQuizRecord = await thisQuiz.get();
  if(!thisQuizRecord.exists) {
    await thisQuiz.set({});
    thisQuizRecord = await thisQuiz.get();
  }

  const currentUser = await thisUserRecord.data();
  if(!currentUser.includes(serverId)){
    currentUser.servers[serverId] = serverName;
    await thisUserRecord.set(currentUser);
  }
  
  const currentGuild = await thisGuildRecord.data();
  if(!currentGuild.teams.includes(teamName)){
    currentGuild.teams.push(teamName);
    await thisGuildRecord.set(currentGuild);
  }

  const currentScores = await thisQuizRecord.data();
  let total = 0;
  for(round in currentScores){
    total += round.score;
  }
  currentScores[round] = {teamName, score};
  currentScores.total = total;
  const write = thisQuizRecord.set(currentScores);
  return {error: null, response: write};
}

exports.getUserFromFirestore = async (userId, serverId) => {
  if(!userId || !serverId){
    return {error: {code: 400, loc: "firestore/users.js", message: `Missing parameters - expected userId and serverId`}, response: null}
  }

  const quiz = quizDate();

  const thisUser = firestore.collection('Users').doc(userId)
  const thisGuild = thisUser.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz);

  const thisUserStorage = await thisUser.get();
  if(!thisUserStorage.exists){
    return {error: {code: 404, loc: "firestore/users.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/users.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, loc: "firestore/users.js", message: `No firestore document for a Quiz Session on ${quiz} for ${serverId}`}, response: null};
  }

  const scoresData = await thisQuizStore.data();
  if(!scoresData.current){
    return {error: {code: 404, loc: "firestore/users.js", message: `Document does not contain data for the ${quiz} Quiz for ${serverId}`}, response: null};
  }

  return {error: null, response: scoresData}
}

exports.getUserTeamNames = async (userId, serverId) => {
  if(!userId || !serverId){
    return {error: {code: 400, loc: "firestore/users.js", message: `Missing parameters - expected userId and serverId`}, response: null}
  }

  const thisUser = firestore.collection('Users').doc(userId);
  const thisGuild = thisUser.collection('Servers').doc(serverId);

  const thisUserStorage = await thisUser.get();
  if(!thisUserStorage.exists){
    return {error: {code: 404, loc: "firestore/users.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, loc: "firestore/users.js", message: `No firestore document for ${serverId}`}, response: null};
  }

  const {teams} = await thisGuildStorage.data();

  return {error: null, response: teams};
}