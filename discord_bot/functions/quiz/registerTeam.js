const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { findRole, createRole, roleAssign, createTextChannel, createVoiceChannel, findCategoryChannel } = require('../discord')
const { setTeamsAliases, deleteTeamsAliases, setTeamsMembers, deleteTeamsMembers, addTeamMemberToFirestore } = require("../firestore");
const { localisedLogging } = require('../../logging');

// keep a history of the roles and channels created as we go along,
// so that if a step fails we can undo the completed actions before returning the error message to the end-user
const history = [];

module.exports = (interaction, team) => {
  const logger = localisedLogging(new Error(), arguments, this, interaction.blob)
  
  if(!interaction || !team){
    const error = {code: 400, message: `Interaction was ${interaction}, Team was ${team}`};
    logger.error({...error});
    return {error, response: null};
  }

  const guild = interaction.guild;
  const self = findRole(guild, "Quizzy");
  const {teamName, captain, members, settledColour} = team;
  const data = JSON.parse(JSON.stringify(team));
  const textChannelName = textifyTeamName(teamName.toLowerCase());
  logger.info(`Textified "${teamName}" => "${textChannelName}"`)

  const roleDetails = {
    name: `Team: ${teamName}`,
    color: settledColour,
    hoist: true,
    mentionable: true,
  };
  
  return createRole(guild, roleDetails)
  .then(({error, response}) => {
    if(error){
      undo(interaction, logger);
      throw error;
    }
    logger.info(`SUCCESS [createRole response: (${response})]`)
    const teamRole = response;
    history.push(teamRole);
    
    ({error, response} = findRole(guild, "Team Captain"));
    if(error){
      undo(interaction, logger);
      throw error;
    }
    const captainRole = response;
    // don't push to history - this isn't something we've created, and we wouldn't want to undo it if something fails

    ({error, response} = findRole(guild, "Teams"));
    if(error){
      undo(interaction, logger);
      throw error;
    }
    const teamsRole = response;
    // don't push to history - this isn't something we've created, and we wouldn't want to undo it if something fails

    const promises = [];

    promises.push(
      roleAssign(teamRole, [captain, ...members]),
      roleAssign(teamsRole, [captain, ...members]),
      roleAssign(captainRole, [captain])
    );

    return Promise.all(promises);
  })
  .then(([teamRole, teamsRole, captainRole]) => {
    if(teamRole.error || teamsRole.error || captainRole.error){
      undo(interaction, logger);
      const errMsg = [teamRole.error, teamsRole.error, captainRole.error].filter(_ => _ !== null).map(_ => _.message).join('; ')
      const error = {message: `Role Assignment(s) failed: ${errMsg}`, code: 500}
      throw error
    }
    const {error, response} = findCategoryChannel(guild, "QUIZ TEAMS");
    if(error){
      undo(interaction, logger);
      throw error;
    }

    data.roles = {teamRole: teamRole.response, captainRole: captainRole.response};
    const quizTeamsCategory = response;
    const promises = [];
    // we want to make the channels viewable only to those with the teamRole, and ourself (the bot)
    const permissions = [
      {id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel],},
      {id: self.response.id, allow: [PermissionFlagsBits.ViewChannel]},
      {id: teamRole.response.id, allow: [PermissionFlagsBits.ViewChannel]}
    ]

    const textChannel = {
      name: textChannelName,
      parent: quizTeamsCategory,
      permissionOverwrites: permissions,
    }

    const voiceChannel = {
      name: teamName,
      parent: quizTeamsCategory,
      permissionOverwrites: permissions,
    }

    promises.push(createTextChannel(guild, textChannel), createVoiceChannel(guild, voiceChannel));

    return Promise.all(promises);
  })
  .then(([textChannel, voiceChannel]) => {
    if(textChannel.error || voiceChannel.error){
      undo(interaction, logger);
      const errMsg = [textChannel.error, voiceChannel.error].filter(_ => _ !== null).map(_ => _.message).join('; ')
      const error = {message: `Channel Creation(s) failed: ${errMsg}`, code: 500}
      throw error
    }
    history.push(textChannel.response, voiceChannel.response);
    data.channels = {textChannel: textChannel.response, voiceChannel: voiceChannel.response};

    if(textChannelName !== teamName){
      // this catches when we have created a different version of the teamname for the text channel
      
      const {error, response} = setTeamsAliases(interaction.guildId, teamName.toLowerCase(), textChannelName.toLowerCase());
      if(error){
        // this is a non-fatal error, and is just a 'nice to have' if it works
        logger.warn(error);
      } else {
        history.push(response)
      }
    }
    const teamMembers = [...members, captain];
    return setTeamsMembers(interaction.guildId, teamName.toLowerCase(), teamMembers);
  })
  .then(({error, response}) => {
    if(error){
      // this is a non-fatal error, however it will cause incorrect pre-registration checks against team members
      logger.warn(error);
    } else {
      history.push(response);
    }
    const promises = [...members, captain].map((member) => {return addTeamMemberToFirestore(member, interaction.guild, teamName)});
    return Promise.all(promises);
  })
  .then((responses) => {
    responses.forEach(({error, response}) => {
      if(error){
        // this is a non-fatal error, we just haven't recorded the user in firestore
        logger.warn(error);
      } else {
        history.push(response);
      }
    })

    const successfulRegistration = new EmbedBuilder()
      .setColor(settledColour)
      .setTitle(`Registration Successful`)
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setImage('https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png')
    
    if(teamName !== textChannelName){
      successfulRegistration.addFields({name: "Team Name", value: `${teamName} (${textChannelName})`});
    } else {
      successfulRegistration.addFields({name: "Team Name", value: teamName});
    }

    successfulRegistration.addFields({name: "Team Captain", value: `${captain}`});
    
    if(members.length > 0){
      successfulRegistration.addFields({name: "Team Members", value: members.join('\n')});
    }

    logger.info(`SUCCESS:  Team Registration complete - posting embed update to channel.`)

    return {error: null, response: {embed: successfulRegistration, data}};
  })
  .catch((error) => {
    logger.error({...error});
    undo(interaction, logger);
    return{error, response: null}
  })
}

const textifyTeamName = (string) => {
  string = string.replaceAll("+", "＋");
  string = string.replaceAll("-", "–");
  string = string.replaceAll("'", "´");
  string = string.replaceAll("$", "S");
  string = string.replaceAll(" & ", " and ");
  string = string.replaceAll("&", " and ");
  string = string.replaceAll(" = ", " is ");
  string = string.replaceAll("=", " is ");
  string = string.replaceAll(!/[\w\＋\–\´\ ]/, " ")
  const chars = string.split('');
  const textified = chars.filter((char) => {return /[\w\＋\–\´\ ]/.test(char)});
  return textified.join('');
}

const undo = (interaction, logger) => {
  logger.warn("FAILURE: Team Registration aborted - attempting to undo all actions taken")
  history.forEach((actionTaken) => {
    try{
      if(String(actionTaken).includes('<=>')){
        // this is our team members registration, where teams and members are mapped to one another
        logger.warn(`Firestore | Attempt undo for relation of teams and members`)
        const registration = actionTaken.split('<=>');
        deleteTeamsMembers(interaction.guildId, registration).then((deletion) => logger.info(deletion.response));
      } else if(String(actionTaken).includes('<?>')){
        // this is our team aliases registration, where teamname and textchannelname are mapped to one another
        logger.warn(`Firestore | Attempt undo for relation of teamname aliases and textchannel name`)
        const registration = actionTaken.split('<?>');
        deleteTeamsAliases(interaction.guildId, registration).then((deletion) => logger.info(deletion.response));
      } else {
        // this is a discord action (e.g. Role creation or Channel Creation)
        logger.warn(`Firestore | Attempt undo for Channels and Roles created`)
        actionTaken.delete().then((deletion) => logger.info(`Deleted ${deletion.constructor.name} ${deletion.name}`));
      }
    } catch(e){
      logger.error("FATAL: registerTeam undo() failed!\nERR =>", e);
    }
  })
}