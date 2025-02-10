const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const quizReset = require("../../functions/quiz/quizReset");
const { findCategoryChannel } = require("../../functions/discord");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('quiz-reset')
    .setDescription('Removes all team roles and channels')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),  // admin only command
  async execute(interaction) {
    const confirmation_screen = new EmbedBuilder()
      .setColor('Red')
      .setTitle(":warning: CAUTION: Quiz Reset")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})

    const teamChannels = findCategoryChannel(interaction.guild, 'QUIZ TEAMS');
    const quizSession = {}
    teamChannels.response.children.cache.forEach((channel) => {
      if(!quizSession[channel.constructor.name]){
        quizSession[channel.constructor.name] = [];
      }
      quizSession[channel.constructor.name].push(channel.name);
    });
    const teamRoles = interaction.guild.roles.cache.filter(role => role.name.split(' ')[0] === "Team:");
    teamRoles.forEach((role) => {
      if(!quizSession[role.constructor.name]){
        quizSession[role.constructor.name] = [];
      }
      quizSession[role.constructor.name].push(role.name.replace("Team: ", ""));
    })

    const sessionDetails = Object.keys(quizSession);
    sessionDetails.forEach((detail) => {
      confirmation_screen.addFields({name: `${quizSession[detail].length} ${detail}s`, value: `${quizSession[detail].join('\n')}`})
    })

    const confirm = new ButtonBuilder()
      .setCustomId('reset')
      .setLabel('Reset')
      .setStyle(ButtonStyle.Danger)

    const cancel = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder()
      .addComponents(confirm, cancel)

    const confirmation = await interaction.reply({embeds: [confirmation_screen], components: [row], flags: MessageFlags.Ephemeral});

    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      if(reply.customId === 'cancel'){
        interaction.editReply({ content: `Action cancelled.`, embeds: [], components: [] })
        return;
      } else if(reply.customId === 'reset'){
        const {error, response} = await quizReset(interaction.guild, interaction.user.globalName);
        if(error){
          throw error
        }
        const deletions = Object.keys(response)
        let message = `Deleted:`
        deletions.forEach((element) => {
          let msg = ` ${response[element].length} ${element}`;
          if(response[element].length > 1 || response[element].length === 0){
            msg += 's';
          }
          message += `\n${msg}`;
        })

        const success_message = new EmbedBuilder()
          .setColor('Yellow')
          .setTitle(`Quiz Reset by ${interaction.user.globalName}`)
          .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
          .addFields({name: "Reset Complete", value: message})

        interaction.editReply({ embeds: [success_message], components: []});
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the confirmation popup
        await interaction.editReply({ content: 'Response not received within 10 seconds, cancelling...', embeds: [], components: [] });
      } else {
        console.error("quiz-reset error handler:\nERR =>", e);
        await interaction.editReply({ content: `An unknown error occurred - see the logs for further details`, components: [] });
      }
    }
  }
}