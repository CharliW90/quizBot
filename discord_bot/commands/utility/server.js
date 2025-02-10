const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { indexQuizzes, indexTeams } = require('../../functions/firestore/quiz');
const { quizDate } = require('../../database');
const { indexRounds } = require('../../functions/firestore/responses');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Provides information about the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),  // admin only command
  async execute(interaction) {
    const today = quizDate();

    const data = { quizRunning: false, quizdates: [] }
    const { error, response } = await indexQuizzes(interaction.guildId);
    if (error) {
      console.error("server error handler:\nERR => ", error)
      if (error.code && error.message) {
        interaction.reply(`${JSON.stringify(error)}`)
      } else {
        interaction.reply({ content: `An unknown error occurred - see the logs for further details`, embeds: [], components: [] })
      }
      return;
    } else {
      data.quizdates = response;
      if (response.find(quiz => quiz.date.code === today.code)) {
        data.quizRunning = true;

        const thisQuizTeams = await indexTeams(interaction.guildId);
        if (thisQuizTeams.response) {
          data.thisQuizTeams = thisQuizTeams.response;
        }

        const thisQuizRounds = await indexRounds(interaction.guildId);
        if (thisQuizRounds.response) {
          data.thisQuizRounds = thisQuizRounds.response;
        }
      }
    }

    const reply = new EmbedBuilder()
      .setColor('e511c7')
      .setTitle(`Server Status for ${interaction.guild.name}`)
      .setAuthor({ name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/' })
      .setThumbnail('https://discord.com/assets/4ffa4ee231208ea704a2.svg')
      .addFields(
        { name: "Member Count", value: `${interaction.guild.memberCount} (${interaction.guild.members.cache.size} online)` },
        { name: "Past Quizzes on record", value: `${data.quizRunning ? data.quizdates.length - 1 : data.quizdates.length}` }
      )

    if (data.quizRunning) {
      reply.addFields({ name: `${today.name}`, value: ":white_check_mark: Quiz running today:" })

      if (data.thisQuizTeams.length > 1) {
        reply.addFields({ name: ":busts_in_silhouette: Teams registered:", value: `${data.thisQuizTeams.join('\n')}` })
      } else {
        reply.addFields({ name: ":busts_in_silhouette: Teams registered:", value: `${data.thisQuizTeams.length}` })
      }

      if (data.thisQuizRounds.length > 0) {
        reply.addFields({ name: ":bookmark_tabs: Rounds marked and retrieved:", value: `${data.thisQuizRounds.join('\n')}` })
      } else {
        reply.addFields({ name: ":bookmark_tabs: Rounds marked and retrieved:", value: `${data.thisQuizRounds.length}` })
      }
    } else {
      reply.addFields({ name: `${today.name}`, value: ":x: No Quiz running today:" })
    }

    await interaction.reply({ embeds: [reply] })
  },
};