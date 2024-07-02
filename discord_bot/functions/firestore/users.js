const { firestore, quizDate } = require("../../database");

exports.addTeamMemberToFirestore = async (member, guild, teamName) => {
  if(!member || !guild || !teamName){
    return {error: {code: 400, loc: "firestore/users/addTeamMemberToFirestore", message: `Missing parameters - expected member, guild and teamName`}, response: null}
  }

  if(!member.user || !guild.id){
    return {error: {code: 400, loc: "firestore/users/addTeamMemberToFirestore", message: `Error in parameters - missing properties for member.user ${member.user} or guild.id ${guild.id}`}, response: null}
  }
  const quiz = quizDate();

  const thisUser = firestore.collection('Users').doc(member.user.id);
  const thisGuild = thisUser.collection('Servers').doc(guild.id);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);

  let thisUserRecord = await thisUser.get();
  if(!thisUserRecord.exists){
    await thisUser.set({currentName: member.user.globalName, initialName: member.user.globalName, username: member.user.username});
    thisUserRecord = await thisUser.get()
  }

  const userData = await thisUserRecord.data();
  if(userData.currentName !== member.user.globalName){
    thisUser.update({currentName: member.user.globalName});
  }

  let thisGuildRecord = await thisGuild.get();
  if(!thisGuildRecord.exists){
    await thisGuild.set({usersTeams: [], server: {name: guild.name, owner: guild.ownerId, initialName: guild.name, initialOwner: guild.ownerId}});
    thisGuildRecord = await thisGuild.get();
  }

  const guildData = await thisGuildRecord.data();
  if(guildData.server.name !== guild.name || guildData.server.owner !== guild.ownerId){
    thisGuild.update({'server.name': guild.name, 'server.owner': guild.ownerId});
  }

  let thisQuizRecord = await thisQuiz.get();
  if(!thisQuizRecord.exists) {
    await thisQuiz.set({});
    thisQuizRecord = await thisQuiz.get();
  }
  
  const currentGuild = thisGuildRecord.data();
  const teams = currentGuild.usersTeams;
  if(!teams.includes(teamName)){
    teams.unshift(teamName)
    await thisGuild.update({usersTeams: teams});
  }

  thisGuildRecord = await thisGuild.get();
  const registration = thisGuildRecord.data();

  return {error: null, response: registration};
}

exports.postScoreToUser = async (userId, serverId, roundNum, score, teamName) => {
  if(!userId || !serverId || !roundNum || isNaN(roundNum) || !score || isNaN(score) || teamName){
    return {error: {code: 400, loc: "firestore/users/postScoreToUser", message: `Missing parameters - expected userId, serverId, serverName, roundNum (number), score (number), and teamName`}, response: null}
  }
  const quiz = quizDate();
  const quizRound = `Round ${roundNum}`;

  const thisUser = firestore.collection('Users').doc(userId);
  const thisGuild = thisUser.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(quiz.code);

  const thisUserRecord = await thisUser.get();
  if(!thisUserRecord.exists){
    return {error: {code: 404, message: `No firestore document for ${userId}`}, response: null};
  }

  const thisGuildRecord = await thisGuild.get();
  if(!thisGuildRecord.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId} under ${userId}`}, response: null};
  }

  let thisQuizRecord = await thisQuiz.get();
  if(!thisQuizRecord.exists) {
    await thisQuiz.set({date: quiz.name, total: 0});
    thisQuizRecord = await thisQuiz.get();
  }

  const currentScores = await thisQuizRecord.data();
  let total = score;
  for(const round in currentScores){
    total += round.score;
  }
  currentScores[quizRound] = {teamName, score};
  currentScores.total = total;
  const write = thisQuizRecord.set(currentScores);
  return {error: null, response: write};
}

exports.getUserFromFirestore = async (userId, serverId, session = null) => {
  if(!userId || !serverId){
    return {error: {code: 400, loc: "firestore/users/getUserFromFirestore", message: `Missing parameters - expected userId and serverId`}, response: null}
  }

  const quiz = quizDate();

  const thisUser = firestore.collection('Users').doc(userId)
  const thisGuild = thisUser.collection('Servers').doc(serverId);
  const thisQuiz = thisGuild.collection('Quizzes').doc(session ?? quiz.code);

  const thisUserStorage = await thisUser.get();
  if(!thisUserStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${userId}`}, response: null};
  }

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId} under ${userId}`}, response: null};
  }

  const thisQuizStore = await thisQuiz.get();
  if(!thisQuizStore.exists) {
    return {error: {code: 404, message: `No firestore document for a Quiz Session on ${session ?? quiz.code} for ${serverId} under ${userId}`}, response: null};
  }

  const scoresData = await thisQuizStore.data();
  if(!scoresData.current){
    return {error: {code: 404, message: `Document does not contain data for the ${session ?? quiz.code} Quiz for ${serverId} under ${userId}`}, response: null};
  }

  return {error: null, response: scoresData}
}

exports.getUserTeamNames = async (userId, serverId) => {
  if(!userId || !serverId){
    return {error: {code: 400, loc: "firestore/users/getUserTeamNames", message: `Missing parameters - expected userId and serverId`}, response: null}
  }

  const thisUser = firestore.collection('Users').doc(userId);
  const thisGuild = thisUser.collection('Servers').doc(serverId);

  const thisUserStorage = await thisUser.get();
  if(!thisUserStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${userId}`}, response: null};
  }

  const thisGuildStorage = await thisGuild.get();
  if(!thisGuildStorage.exists){
    return {error: {code: 404, message: `No firestore document for ${serverId} under ${userId}`}, response: null};
  }

  const {usersTeams} = await thisGuildStorage.data();

  return {error: null, response: usersTeams};
}