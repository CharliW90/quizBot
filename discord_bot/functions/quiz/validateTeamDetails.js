const { EmbedBuilder } = require('discord.js');
const { checkMembers, lookupAlias } = require('../../functions/firestore');
const { findAdmins } = require('../../functions/discord');
const { localisedLogging } = require('../../logging');
const path = require('path')

module.exports = async (interaction, teamName, teamMembers) => {
  const logger = localisedLogging(new Error(), arguments, this, interaction.blob)
  
  const roles = interaction.guild.roles.cache.map(role => role.name);
  const dupedRole = roles.filter((role) => {return role.toLowerCase() === teamName.toLowerCase()});
  const channels = interaction.guild.channels.cache.map((channel) => {return `${channel.constructor.name}: ${channel.name}`});
  const dupedChannel = channels.filter((channel) => {return (channel.split(': ')[1].toLowerCase() === teamName.toLowerCase() || channel.split(': ')[1].toLowerCase() === teamName.toLowerCase().replaceAll(" ", "-"))});
  const aliasCheck = await lookupAlias(interaction.guildId, teamName);
  const membersCheck = await checkMembers(interaction.guildId, teamMembers);
  const guildAdmins = findAdmins(interaction.guild).response.admins;

  const admins = [];
  const bots = [];
  let registeringSelf = false;
  teamMembers.forEach((member) => {
    if(member.id === interaction.user.id){
      registeringSelf = true
    }
    if(guildAdmins.has(member.id)){
      if(!teamName.includes("#!?")){   // use '#!?' in the team name as an override to allow admins to be added
        admins.push(member)
      }
    }else if(member.user.bot){
      bots.push(member)
    }
  })

  if(!registeringSelf && !guildAdmins.has(interaction.user.id)){
    logger.warn(`${interaction.user.globalName} attempted to register a team that was not their own\nNAME: ${teamName}\nMEMBERS:\n--${teamMembers.join('\n--')}`)
    const refusal = new EmbedBuilder()
      .setColor('Red')
      .setTitle(":x: You are not permitted to register other people to teams!")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setThumbnail('https://discord.com/assets/4ffa4ee231208ea704a2.svg')

    return {error: {code: 400, message: `Invalid team registration request`, embedMessage: refusal}, response: null};
  }
    
  if(dupedRole.length > 0 || dupedChannel.length > 0 || aliasCheck.response || membersCheck.response || admins.length > 0 || bots.length > 0){
    const refusal = new EmbedBuilder()
      .setColor('Red')
      .setTitle(":x: Registration request not valid!")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setThumbnail('https://discord.com/assets/4ffa4ee231208ea704a2.svg')
      .addFields(
        {name: "Team Name requested", value: teamName},
        {name: "Team Member(s) requested", value: teamMembers.join('\n')}
      )
    
    logger.debug({membersCheck})

    if(admins.length > 0){
      refusal.addFields({name: ":x: Admin Member not allowed",  value: admins.join('\n')});
    }

    if(bots.length > 0){
      refusal.addFields({name: ":x: Bot Member not allowed",  value: bots.join('\n')});
    }

    if(dupedRole.length > 0){
      refusal.addFields(
        {name: ":warning: Role already exists", value: `${dupedRole.join('\n')}`},
      )
    }
    if(dupedChannel.length > 0){
      refusal.addFields(
        {name: ":warning: Channel(s) already exist", value: `${dupedChannel.join('\n')}`},
      )
    }
    if(aliasCheck.response){
      refusal.addFields(
        {name: ":warning: Team already exists", value: `${teamName} is ${aliasCheck.response}`},
      )
    }
    if(membersCheck.response){
      const errors = membersCheck.response.map(member => `${member.user} is in Team: ${member.team}`)
      refusal.addFields(
        {name: ":warning: Member(s) already in a team", value: `${errors.join('\n')}`}
      )
    }
    return {error: {code: 400, message: `Invalid components in team registration request`, embedMessage: refusal}, response: null};
  } else {
    return {error: null, response: true}
  }
}