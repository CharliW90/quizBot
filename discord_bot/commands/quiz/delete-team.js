const { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { findRole } = require("../../functions/discord");
const teamDelete = require("../../functions/quiz/teamDelete");
const { localisedLogging, throttledLogger } = require("../../logging");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('delete-team')
    .setDescription('Deletes the whole team')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // admin only command
    .addStringOption(option => 
      option
        .setName('team')
        .setDescription('The team to delete')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const logger = throttledLogger(localisedLogging(new Error(), arguments, this));
    const focusedOption = interaction.options.getFocused();
    const guildRoles = await interaction.guild.roles.cache;
    const teamRoles = guildRoles.filter((role) => {
      const prefix = role.name.split(' ')[0];
      return prefix === "Team:"
    });
    logger("debug", {msg: `option = teamRoles: interaction.guild.roles.cache.filter():`, teamRoles})
    const filtered = teamRoles.filter(choice => choice.name.startsWith(focusedOption));
    await interaction.respond(
      filtered.map(choice => ({ name: choice.name.replace("Team: ", ""), value: choice.name}))
    )
  },
  async execute(interaction) {
    const logger = localisedLogging(new Error(), arguments, this);
    logger.debug()
    const teamName = interaction.options.getString('team')
    const {error, response} = findRole(interaction.guild, teamName)
    if(error){
      interaction.reply(`Error: ${JSON.stringify(error)}`)
    }
    const confirm = new ButtonBuilder()
      .setCustomId('delete')
      .setLabel('Delete Team')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️')

    const cancel = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder()
      .addComponents(confirm, cancel)

    const confirmation = await interaction.reply({content: `Are you sure you want to delete ${response}??`, components: [row], ephemeral: true});
    
    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      if(reply.customId === 'cancel'){
        interaction.editReply({ content: `Action cancelled.`, components: []});
        return;
      }else if(reply.customId === 'delete'){
        interaction.editReply({ content: `Deleting the team...`, components: [] })
        .then(() => {
          return teamDelete(interaction.guild, response)
        })
        .then(({error, response}) => {
          if(error){
            throw error;
          }
          interaction.channel.send({embeds: [response]});
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
        console.error("delete-team error handler:\nERR =>", e);
        await confirmation.edit({ content: `An unknown error occurred - see the logs for further details`, components: [] });
      }
    }
    
  }
}