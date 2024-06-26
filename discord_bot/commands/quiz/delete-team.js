const { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { findRole } = require("../../functions/discord");
const teamDelete = require("../../functions/quiz/teamDelete");

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
    const focusedOption = interaction.options.getFocused();
    const guildRoles = await interaction.guild.roles.cache.map(role => role);
    const teamRoles = guildRoles.filter((role) => {
      const prefix = role.name.split(' ')[0];
      return prefix === "Team:"
    });
    const filtered = teamRoles.filter(choice => choice.name.startsWith(focusedOption));
    await interaction.respond(
      filtered.map(choice => ({ name: choice.name.replace("Team: ", ""), value: choice.name}))
    )
  },
  async execute(interaction) {
    const teamName = interaction.options.getString('team')
    const {error, response} = findRole(interaction.guild, teamName)
    if(error){
      console.error(error)
      interaction.reply(`Error: ${error}`)
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
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
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
          console.error(error);
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await confirmation.edit({ content: 'Response not received within 1 minute, cancelling...', components: [] });
      } else {
        throw e;
      }
    }
    
  }
}