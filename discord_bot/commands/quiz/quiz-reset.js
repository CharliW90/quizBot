const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
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
    const teamRoles = interaction.guild.roles.cache.map(role => role).filter(role => role.name.split(' ')[0] === "Team:");
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

    await interaction.reply({embeds: [confirmation_screen]});
    const confirmation = await interaction.channel.send({components: [row]});

    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
      if(reply.customId === 'cancel'){
        interaction.editReply({ content: `Action cancelled.`, embeds: [] })
        confirmation.delete();
        return;
      } else if(reply.customId === 'reset'){
        const {error, response} = await quizReset(interaction.guild);
        if(error){
          throw error
        }
        const deletions = Object.keys(response)
        let message = `Deleted`
        deletions.forEach((element) => {
          let msg = ` ${response[element].length} ${element}`;
          if(response[element].length > 1 || response[element].length === 0){
            msg += 's';
          }
          message += msg;
        })

        const success_message = new EmbedBuilder()
          .setColor('Yellow')
          .setTitle("Quiz Reset")
          .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
          .addFields({name: "Reset Complete", value: message})

        reply.update({ embeds: [success_message], components: [] });
        interaction.deleteReply();
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the confirmation popup
        await confirmation.edit({ content: 'Response not received within 1 minute, cancelling...', components: [] });
      } else {
        throw e;
      }
    }
  }
}