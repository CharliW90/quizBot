const { Guild, PermissionFlagsBits, Role, TextChannel, VoiceChannel, EmbedBuilder } = require("discord.js");
const {findRole, createRole, assignRole, createTextChannel, createVoiceChannel, findCategoryChannel} = require('../discord')
const { registerTeamChannel, setAlias, deleteTeam } = require("../maps/teamChannels");
const { registerTeamMembers, deleteTeamMembers } = require("../maps/teamMembers");

// keep a history of the roles and channels created as we go along,
// so that if a step fails we can undo the completed actions before returning the error message to the end-user
const history = [];

module.exports = (interaction, team) => {
  const guild = interaction.guild;
  const self = findRole(guild, "Quizzy");
  const {teamName, captain, members, settledColour} = team;
  const textChannelName = textifyTeamName(teamName.toLowerCase());

  const roleDetails = {
    name: `Team: ${teamName}`,
    color: settledColour,
    hoist: true,
    mentionable: true,
  };
  
  return createRole(guild, roleDetails)
  .then(({error, response}) => {
    if(error){
      undo();
      throw error;
    }
    const teamRole = response;
    history.push(teamRole);
    
    ({error, response} = findRole(guild, "Team Captain"));
    if(error){
      undo();
      throw error;
    }
    const captainRole = response;
    // don't push to history - this isn't something we've created, and we wouldn't want to undo it if something fails

    const promises = [];

    promises.push(
      assignRole(teamRole, [captain, ...members]),
      assignRole(captainRole, [captain])
    );

    return Promise.all(promises);
  })
  .then(([teamRole, captainRole]) => {
    const {error, response} = findCategoryChannel(guild, "QUIZ TEAMS");
    if(error){
      undo();
      throw error;
    }

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
      undo();
      const message = `Text Channel error: ${textChannel.error.message}\nVoice Channel error: ${voiceChannel.error.message}`
      throw {message, code: 500};
    }
    history.push(textChannel.response, voiceChannel.response);

    return registerTeamChannel(teamName, textChannel.response);
  })
  .then(({error, response}) => {
    if(error){
      // this is a non-fatal error, it can be corrected later on when handling scores/results
      console.warn(error);
    } else {
      history.push(response);
    }

    if(textChannelName !== teamName){
      // this catches when we have created a different version of the teamname for the text channel
      ({error, response} = setAlias(textChannelName, teamName));
      if(error){
        // this is a non-fatal error, and is just a 'nice to have' if it works
        console.warn(error);
      }
    }

    return registerTeamMembers(teamName, [...members, captain]);
  })
  .then(({error, response}) => {
    if(error){
      // this is a non-fatal error, however it will cause incorrect pre-registration checks against team members
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
        // this is our team registration, where a teamName is mapped to its text channel
        const registration = actionTaken.split('::')[0];
        deleteTeam(registration).then((deletion) => console.log(deletion.response));
      } else if(actionTaken.includes('<=>')){
        // this is our team members registration, where teams and members are mapped to one another
        const registration = actionTaken.split('<=>')[0];
        deleteTeamMembers(registration).then((deletion) => console.log(deletion.response));
      } else {
        // this is a discord action (e.g. Role creation or Channel Creation)
        actionTaken.delete().then((deletion) => console.log(`Deleted ${deletion.constructor.name} ${deletion.name}`));
      }
    } catch(e){
      console.error(e);
    }
  })
}