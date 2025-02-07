const { ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { recordTeam, getUserTeamNames } = require('../../functions/firestore');
const { localisedLogging } = require('../../logging');

const validateTeamDetails = require('../../functions/quiz/validateTeamDetails');

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
        .setMaxLength(64)
        .setRequired(true)
        .setAutocomplete(true))
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
    .addUserOption(option =>
      option.setName('team-member-3')
        .setDescription('Team Member'))
    .addStringOption(option =>
      option.setName('colour')
        .setDescription('Team Colour')
        .addChoices(
          {name: 'Random (default)', value: 'Random'},
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
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused();
    const {response} = await getUserTeamNames(interaction.user.id, interaction.guildId);
    const usersFormerTeamNames = response ?? [];
    const filtered = usersFormerTeamNames.filter(choice => choice.startsWith(focusedOption));
    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice}))
    )
  },
  async execute(interaction) {
    const logger = localisedLogging(new Error(), arguments, this, interaction.blob);
    const registerTeam = require('../../functions/quiz/registerTeam');
    
    const teamName = interaction.options.getString('team-name').trim();
    const captain = interaction.options.getMember('team-captain');
    logger.info(`Registering Team: (${teamName}) with Captain: (${captain.user.globalName}) [Requested by ${interaction.user.globalName}]`)
    
    const members = [];
    if(interaction.options.getMember('team-member-1')) {members.push(interaction.options.getMember('team-member-1'))}
    if(interaction.options.getMember('team-member-2')) {members.push(interaction.options.getMember('team-member-2'))}
    if(interaction.options.getMember('team-member-3')) {members.push(interaction.options.getMember('team-member-3'))}

    const {error, response} = await validateTeamDetails(interaction, teamName, [...members, captain]);

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
        {name: "Captain", value: `${captain}`}
      )

    members.forEach((member) => {
      confirmation_screen.addFields(
        {name: "Team Member", value: `${member}`}
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
      
    const confirmation = await interaction.reply({content: 'Please review your draft team registration, and confirm the details for me',embeds: [confirmation_screen], components: [row], ephemeral: true});

    const collectorFilter = i => i.user.id === interaction.user.id || captain.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      if(reply.customId === 'cancel'){
        logger.info(`User cancelled registration attempt`)
        interaction.editReply({ content: `Action cancelled.`, embeds: [], components: [] });
        return;
      } else if(reply.customId === 'register'){
        const settledColour = confirmation_screen.data.color;
        // const thisMessage = ```User confirmed registration attempt for: 
        //   teamName: (${teamName}), 
        //   captain: (${captain}), 
        //   members: (${members}), 
        //   settledColour: (${settledColour})```
        // logger.info(thisMessage)
        interaction.editReply({ content: `Registering your team...`, components: [] })
        .then(() => {
          return registerTeam(interaction, {teamName, captain, members, settledColour})
        })
        .then(({error,  response}) => {
          if(error){
            throw error;
          }
          logger.info(`SUCCESS: team registered successfully.`)
          interaction.channel.send({embeds: [response.embed]});
          interaction.deleteReply()
          if(interaction.user !== captain.user){
            captain.send(`Hey there - you've just been registered as the team captain for Team: ${teamName}`)
          }
          members.forEach((member) => {
            if(interaction.user !== member.user){
              member.send(`Hey there - you've just been registered as being a member of Team: ${teamName}\nThink this is incorrect?   You can leave the team with the /leave command.\n\nGood luck, have fun!`);
            };
          })
          return recordTeam(interaction.guildId, response.data);
        })
        .then(({error, response}) => {
          if(error){
            throw error;
          }
        })
        .catch((error) => {
          if(error.code && error.message){interaction.channel.send({content: `${JSON.stringify(error)}`})};
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await confirmation.edit({ content: 'Response not received within 10 seconds, cancelling...', components: [] });
      } else {
        console.error("register-team error handler:\nERR =>", e);
        await confirmation.edit({content: `An unknown error occurred - see the logs for further details`});
      }
    }
  }
}