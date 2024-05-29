const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, GuildMember, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const registerTeam = require('../../functions/quiz/registerTeam');
const { lookupAlias } = require('../../functions/maps/teamChannels');
const { checkMembers } = require('../../functions/maps/teamMembers');

// A command to register a quiz team, including creating a role, and role-restricted channels, for the team members

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('register-team')
    .setDescription('Register a new quiz team')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('team-name')
        .setDescription('The name of the team to register')
        .setMinLength(4)
        .setMaxLength(32)
        .setRequired(true))
    .addUserOption(option =>
      option.setName('team-captain')
        .setDescription('Team Captain')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('team-member-1')
        .setDescription('Team Member'))
    .addUserOption(option =>
      option.setName('team-member-2')
        .setDescription('Team Member'))
    .addMentionableOption(option =>
      option.setName('team-member-3')
        .setDescription('Team Member'))
    .addStringOption(option =>
      option.setName('colour')
        .setDescription('Team Colour')
        .addChoices(
          {name: 'Random', value: 'Random'},
          {name: 'Green', value: 'Green'},
          {name: 'Aqua', value: 'Aqua'},
          {name: 'Blue', value: 'Blue'},
          {name: 'Blurple', value: 'Blurple'},
          {name: 'Pink', value: 'Fuchsia'},
          {name: 'Orange', value: 'Orange'},
          {name: 'Yellow', value: 'Yellow'},
          {name: 'DarkGreen', value: 'DarkGreen'},
          {name: 'DarkBlue', value: 'DarkBlue'},
          {name: 'DarkPurple', value: 'DarkPurple'},
          {name: 'DarkPink', value: 'DarkVividPink'},
          {name: 'DarkOrange', value: 'DarkOrange'},
          {name: 'DarkRed', value: 'DarkRed'},
          {name: 'Greyple', value: 'Greyple'},
          {name: 'White', value: 'White'}
        )
    ),
  async execute(interaction) {
    const teamName = interaction.options.getString('team-name');
    const captain = interaction.options.getMember('team-captain');
    const members = [];
    interaction.options.getMember('team-member-1') ? members.push(interaction.options.getMember('team-member-1')) : ""
    interaction.options.getMember('team-member-2') ? members.push(interaction.options.getMember('team-member-2')) : ""
    interaction.options.getMember('team-member-3') ? members.push(interaction.options.getMember('team-member-3')) : ""

    const {error, response} = validateTeamDetails(interaction, teamName, [...members, captain])

    if(error){
      interaction.reply({embeds: [error.embedMessage]});
      return;
    }

    const teamColour = interaction.options.getString('colour') ?? 'Random';
    const confirmation_screen = new EmbedBuilder()
      .setColor(teamColour)
      .setTitle("Draft Quiz Team to Register")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields(
        {name: "Team Name", value: teamName},
        {name: "Captain", value: captain.user.globalName}
      )

    members.forEach((member) => {
      confirmation_screen.addFields(
        {name: "Team Member", value: member.user.globalName}
      )
    })

    const confirm = new ButtonBuilder()
      .setCustomId('register')
      .setLabel('Register Team')
      .setStyle(ButtonStyle.Primary)

    const cancel = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder()
      .addComponents(confirm, cancel)

    const popup = await interaction.channel.send({embeds: [confirmation_screen]});

    const confirmation = await interaction.reply({
      content: 'Please review your draft team registration, and confirm the details for me',
      components: [row]
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
      if(reply.customId === 'cancel'){
        interaction.channel.messages.delete(popup);
        reply.update({ content: `Action cancelled.`, components: [] })
        return;
      } else if(reply.customId === 'register'){
        const settledColour = confirmation_screen.data.color;
        interaction.channel.messages.delete(popup);
        reply.update({ content: `Registering your team...`, components: [] })
        .then(() => {
          return registerTeam(interaction, {teamName, captain, members, settledColour})
        })
        .then(({error,  response}) => {
          if(error){
            throw error;
          }
          interaction.channel.send({embeds: [response]});
        })
        .catch((error) => {
          console.error(error)
        })
      }
    } catch(e) {
      throw e;
    }
  }
}

const validateTeamDetails = (interaction, teamName, teamMembers) => {
  const roles = interaction.guild.roles.cache.map(role => role.name);
  const dupedRole = roles.filter((role) => {return role.toLowerCase() === teamName.toLowerCase()});
  const channels = interaction.guild.channels.cache.map(channel => channel.name);
  const dupedChannel = channels.filter((channel) => {return channel.toLowerCase() === teamName.toLowerCase()});
  const aliasCheck = lookupAlias(teamName);
  const {error, response} = checkMembers(teamMembers)
  
  if(dupedRole.length > 0 || dupedChannel.length > 0 || aliasCheck.response || !error){
    const refusal = new EmbedBuilder()
      .setColor('Red')
      .setTitle("Registration request not valid!")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setThumbnail('https://discord.com/assets/4ffa4ee231208ea704a2.svg')
      .addFields(
        {name: "Team Name requested", value: teamName},
        {name: "Team Members requested", value: teamMembers.join('\n')}
      )
    if(dupedRole.length > 0){
      refusal.addFields(
        {name: "Role already exists", value: `${dupedRole.join('\n')}`},
      )
    }
    if(dupedChannel.length > 0){
      refusal.addFields(
        {name: "Channel(s) already exist", value: `${dupedChannel.join('\n')}`},
      )
    }
    if(aliasCheck.response){
      refusal.addFields(
        {name: "Team already exists", value: `${teamName} is ${aliasCheck.response}`},
      )
    }
    if(!error){
      response.forEach((err) => {
        refusal.addFields(
        {name: "Member(s) already in a team", value: `${err.user} is in team ${err.team}`},
      )
      })
    }
    return {error: {code: 400, message: `Invalid components in team registration request`, embedMessage: refusal}, response: null};
  } else {
    return {error: null, response: true}
  }
}