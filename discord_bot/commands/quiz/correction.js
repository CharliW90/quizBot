const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require("discord.js");
const { indexRounds, indexResponsesTeams, correctResponseInFirestore, setTeamsAliases } = require("../../functions/firestore");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('correction')
    .setDescription('corrects errors in teams and scores')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // admin only command
    .addSubcommand(subcommand => 
      subcommand
        .setName('team-name')
        .setDescription('Correct an incorrectly typed team name')
        .addStringOption(option =>
          option
            .setName('team')
            .setDescription('The incorrect team name')
            .setAutocomplete(true)
            .setRequired(true)
        ),
    )
    .addSubcommand(subcommand => 
      subcommand
        .setName('score')
        .setDescription("Correct a team's score")
    )
    .addSubcommand(subcommand => 
      subcommand
        .setName('scoreboard')
        .setDescription('Correct the scoreboard')
    ),
  async autocomplete(interaction){
    const focusedOption = interaction.options.getFocused(true);

    let options;

    if(focusedOption.name === 'team'){
      const {error, response} = await indexResponsesTeams(interaction.guildId);
      const teams = response ?? [error.message];
      options = teams.map((team) => {return {name: team, value: team}});
    }

    if(focusedOption.name === 'round'){
      const {error, response} = await indexRounds(interaction.guildId)
      const rounds = response ?? [error.message];
      options = rounds.map((round) => {return {name: round, value: round.split(' ')[1]}})
    }

    const filtered = options.filter(choice => choice.name.startsWith(focusedOption.value));
    await interaction.respond(filtered)
  },
  async execute(interaction) {
    const cmd = interaction.options.getSubcommand();
    if(cmd === "team-name"){
      const teamToAmend = interaction.options.getString('team');
      const {error, response} = await indexResponsesTeams(interaction.guildId);
      const allTeams = response ?? [error.message];
      const teams = allTeams.filter(name => name !== teamToAmend);

      const teamOptions = teams.map((team, i) => {
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${team}`)
          .setValue(`${i}`)
      })

      const correctTeam = new StringSelectMenuBuilder()
        .setCustomId('correctTeam')
        .setPlaceholder('Choose the correct team name')
        .addOptions(...teamOptions);

      const teamsDropdownRow = new ActionRowBuilder()
        .addComponents(correctTeam)
      
      const cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      
      const cancelRow = new ActionRowBuilder()
        .addComponents(cancel);

      const details = await interaction.reply({content: "What is the correct team name?", components: [teamsDropdownRow, cancelRow], ephemeral: true});

      const collectorFilter = i => i.user.id === interaction.user.id;
      try {
        const query = await details.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
        if(query.customId === 'cancel'){
          await query.update({ content: `Action cancelled...`, components: [] });
        } else {
          const correctTeamName = teams[query.values[0]];

          const confirmation_screen = new EmbedBuilder()
            .setColor('Red')
            .setTitle(":warning: Data Change Requested!")
            .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
            .addFields(
              {name: "This will change all rounds that have the team name:", value: teamToAmend},
              {name: "to instead have the team name:", value: correctTeamName}
            )
          
          const confirm = new ButtonBuilder()
            .setCustomId('update')
            .setLabel('Update')
            .setStyle(ButtonStyle.Danger)
      
          const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
      
          const row = new ActionRowBuilder()
            .addComponents(confirm, cancel)

          const confirmation = await query.update({embeds: [confirmation_screen], components: [row]});

          const collectorFilter = i => i.user.id === interaction.user.id;
      
          try{
            const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
            if(reply.customId === 'cancel'){
              interaction.editReply({ content: `Action cancelled.`, embeds: [], components: [] })
              return;
            } else if(reply.customId === 'update'){
              setTeamsAliases(interaction.guildId, correctTeamName, teamToAmend)
              .then(({error, response}) => {
                if(error){throw error}
                return correctResponseInFirestore(interaction.guildId, teamToAmend, correctTeamName)
              })
              .then((responses) => {
                let fails = 0;
                let successes = 0;
                responses.forEach((res) => {
                  const {error, response} = res;
                  if(error){fails++}
                  if(response){successes++}
                })
                interaction.editReply({content: `:white_check_mark: Succesfully amended ${teamToAmend} to ${correctTeamName} for ${successes} rounds; ${fails} failed.`, embeds: [], components: []})
              })
              .catch((error) => {
                if(error.code && error.message){interaction.channel.send({content: `${JSON.stringify(error)}`})};
              })
            }
          }catch(e){
            throw e
          }
        }
      } catch(e) {
        if(e.message === "Collector received no interactions before ending with reason: time"){
          // handles failure to reply to the followup response of 'what do you want to do with the responses?'
          await interaction.editReply({ content: 'Response not received within 10 seconds, cancelling...', embeds: [], components: []});
          return;
        } else {
          console.error("correction error handler:\nERR =>", e);
          await interaction.editReply({content: `An unknown error occurred - see the logs for further details`, embeds: [], components: []});
          return;
        }
      }
    } else if(cmd === "score"){
      interaction.reply("This is a Work in Progress")
    } else if(cmd === "scoreboard"){
      interaction.reply("This is a Work in Progress")
    }
  }
}