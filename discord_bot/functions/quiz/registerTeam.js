const { Guild, PermissionFlagsBits, Role, TextChannel, VoiceChannel, EmbedBuilder } = require("discord.js");
const findRole = require("../findRole");
const createRole = require("../createRole");
const assignRole = require("../assignRole");
const createTextChannel = require("../createTextChannel");
const createVoiceChannel = require("../createVoiceChannel");
const findCategoryChannel = require("../findCategoryChannel");
const { registerTeamChannel, setAlias, deleteTeam } = require("../maps/teamChannels");
const { registerTeamMembers, deleteTeamMembers } = require("../maps/teamMembers");

// keep a history of the roles and channels created as we go along,
// so that if a step fails we can undo the completed actions before returning the error message to the end-user
const history = [];

module.exports = (interaction, team) => {
  const self = findRole(interaction, "Quizzy");
  const {teamName, captain, members, settledColour} = team;
  const textChannelName = textifyTeamName(teamName.toLowerCase());

  const roleDetails = {
    name: `Team: ${teamName}`,
    color: settledColour,
    hoist: true,
    mentionable: true,
  };
  
  return createRole(interaction, roleDetails)
  .then(({error, response}) => {
    if(error){
      undo();
      throw error;
    }
    const teamRole = response;
    history.push(teamRole);
    
    ({error, response} = findRole(interaction, "Team Captain"));
    if(error){
      undo();
      throw error;
    }
    const captainRole = response;
    // don't push to history - this isn't something we've created, and we wouldn't want to undo it if something fails

    const promises = [];
    promises.push(assignRole(teamRole, [captain, ...members]), assignRole(captainRole, [captain]));
    return Promise.all(promises);
  })
  .then(([teamRole, captainRole]) => {
    const {error, response} = findCategoryChannel(interaction, "QUIZ TEAMS");
    if(error){
      undo();
      throw error;
    }
    const quizTeamsCategory = response;

    const promises = [teamRole.response];

    const permissions = [
      {id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel],},
      {id: teamRole.response.id, allow: [PermissionFlagsBits.ViewChannel]},
      {id: self.response.id, allow: [PermissionFlagsBits.ViewChannel]}
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
    promises.push(createTextChannel(interaction, textChannel), createVoiceChannel(interaction, voiceChannel));
    return Promise.all(promises);
  })
  .then(([role, textChannel, voiceChannel]) => {
    if(textChannel.error || voiceChannel.error){
      undo();
      throw textChannel.error ?? voiceChannel.error;
    }
    history.push(textChannel.response, voiceChannel.response);
    return registerTeamChannel(teamName, textChannel.response);
  })
  .then(({error, response}) => {
    if(error){
      console.warn(error);
    } else {
      history.push(response);
    }
    if(textChannelName !== teamName){
      ({error, response} = setAlias(textChannelName, teamName));
      if(error){
        console.warn(error);
      }
    }
    return registerTeamMembers(teamName, [...members, captain]);
  })
  .then(({error, response}) => {
    if(error){
      console.warn(error);
    } else {
      history.push(response);
    }
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

    successfulRegistration.addFields({name: "Team Captain", value: captain.user.globalName});
    
    if(members.length > 0){
      successfulRegistration.addFields({name: "Team Members", value: `${members.join('\n')}`});
    }

    return {error: null, response: successfulRegistration};
  })
  .catch((error) => {
    undo();
    throw error;
  })
  
}

const textifyTeamName = (string) => {
  string = string.replace("+", "＋");
  string = string.replace("-", "–");
  string = string.replace("'", "´");
  string = string.replace("$", "S");
  string = string.replace(" & ", " and ");
  string = string.replace("&", " and ");
  string = string.replace(" = ", " is ");
  string = string.replace("=", " is ");
  string = string.replace(!/[\w\＋\–\´\ ]/, " ")
  const chars = string.split('');
  const textified = chars.filter((char) => {return /[\w\＋\–\´\ ]/.test(char)});
  return textified.join('');
}

const undo = () => {
  history.forEach((actionTaken) => {
    try{
      if(actionTaken.includes('::')){
        const registration = actionTaken.split('::')[0];
        deleteTeam(registration).then((deletion) => console.log(deletion.response));
      } else if(actionTaken.includes('<=>')){
        const registration = actionTaken.split('<=>')[0];
        deleteTeamMembers(registration).then((deletion) => console.log(deletion.response));
      } else {
        actionTaken.delete().then((deletion) => console.log(`Deleted ${deletion.constructor.name} ${deletion.name}`));
      }
    } catch(e){
      console.error(e);
    }
  })
}