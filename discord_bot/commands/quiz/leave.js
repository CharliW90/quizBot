const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { findAdmins, findRole, roleRemove, findTextChannel } = require("../../functions/discord");
const { getTeam } = require("../../functions/firestore");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('leave a quiz team')
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply({flags: MessageFlags.Ephemeral});
    const admins = await findAdmins(interaction.guild).response.admins;

    //if the user is  an admin, then this is the wrong command
    if(admins.has(interaction.member.id)){
      const failure = new EmbedBuilder()
        .setTitle(`Error 400: This is not the command you are looking for...`)
        .setColor('Red')
        .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG1rdDBkcnVhMzQ2NHJhYTR1NjR1cW1jNnlzemFvN25tZGxwM3dhMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2JJKs3I69qfaQleE/giphy.gif')
      await interaction.editReply({embeds: [failure]});
      return;
    }

    const userRoles = interaction.member.roles.cache.map(role => role);
    const teamRole = userRoles.filter(role => role.name.split(' ')[0] === "Team:")[0];
    if(!teamRole){
      const failure = new EmbedBuilder()
        .setTitle(`Error 404: You are not in a team`)
        .setColor('Red')
        .addFields({name: "Roles", value: userRoles.map(role => role.name).filter(name => name !== "@everyone").join('\n')})
      await interaction.editReply({embeds: [failure]});
      return;
    }
    
    const allMembers = await interaction.guild.members.fetch();
    const roleMembers = allMembers.map(member => member).filter(member => member.roles.cache.has(teamRole.id));
    if(roleMembers.length < 2){
      const failure = new EmbedBuilder()
      .setTitle(`Error 400: This would leave an empty team`)
      .setColor('Red')
      .addFields(
        {name: "Current Team Members", value: roleMembers.join('\n')},
        {name: "Help?", value: 'If you want to delete the whole team registration, ask an @admin to /delete-team'}
      )
      await interaction.editReply({embeds: [failure]});
      return;
    }

    const captainRole = findRole(interaction.guild, `Team Captain`).response;
    const [teamCaptain] = roleMembers.filter(member => member.roles.cache.has(captainRole.id));
    const teamMembers = roleMembers.filter(member => member !== teamCaptain);

    if(interaction.member.roles.cache.has(captainRole.id)){
      const failure = new EmbedBuilder()
      .setTitle(`Error 400: This would leave the team without a captain`)
      .setColor('Red')
      .addFields(
        {name: "Current Team Captain", value: `${teamCaptain}`},
        {name: "Current Team Members", value: teamMembers.join('\n')},
        {name: "Help?", value: 'Try using command /team-promote first, to change the captain to another team member'}
      )
      await interaction.editReply({embeds: [failure]});
      return;
    }

    const confirmation_screen = new EmbedBuilder()
      .setColor(teamRole.color)
      .setTitle(`${interaction.user.globalName}'s Request to Leave ${teamRole.name}`)
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields(
        {name: `Team Name`, value: teamRole.name},
        {name: `Team Captain`, value: `${teamCaptain}`}
      )
    if(teamMembers.length > 1){
      confirmation_screen.addFields({name: `Remaining Members`, value: teamMembers.filter(member => member !== interaction.member).join('\n')})
    }

    const confirm = new ButtonBuilder()
      .setCustomId('confirm')
      .setLabel('Update Team')
      .setStyle(ButtonStyle.Primary)

    const cancel = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder()
      .addComponents(confirm, cancel)

    const confirmation = await interaction.editReply({
      content: 'Please review your amendments, and confirm the details for me',
      embeds: [confirmation_screen],
      components: [row]
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });

      if(reply.customId === 'cancel'){
        await interaction.editReply({ content: `Action cancelled.`, embeds: [], components: []});
        return;
      } else if(reply.customId === 'confirm'){
        const removedMember = await removeTeamMember(interaction.member);
        if(removedMember.error){
          await interaction.editReply({ content: `Error ${removedMember.error.code}: ${removedMember.error.message}`, embeds: [], components: [] });
          return;
        };

        const removedRole = await roleRemove(teamRole, [interaction.member]);
        if(removedRole.error){
          await interaction.editReply({ content: `Error ${removedRole.error.code}: ${removedRole.error.message}`, embeds: [], components: [] });
          return;
        };

        const team = await getTeam(interaction.guildId, teamName);
        if(team.error){
          await interaction.editReply({ content: `Error ${error.code}: ${error.message}`, embeds: [], components: [] });
          return;
        }
        
        const teamChannel = findTextChannel(interaction.guild, team.response.textChannel.name);
        if(teamChannel.error){
          await interaction.editReply({ content: `Error ${error.code}: ${error.message}`, embeds: [], components: [] });
          return;
        }

        if(interaction.channel.id !== teamChannel.response.id){
          await interaction.editReply({ content: `You have left ${removedRole.response.name}.`, embeds: [], components: [] });
          await teamChannel.response.send({content: `${interaction.user} has left your team...`, embeds: [confirmation_screen]});
        } else {
          await interaction.followUp({ content: `${interaction.member} has left ${removedRole.response.name}.`, embeds: [confirmation_screen], components: [] });
        }
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await confirmation.edit({ content: 'Response not received within 10 seconds, cancelling...', components: [] });
      } else {
        console.error("leave error handler:\nERR =>", e);
        await confirmation.edit({ content: `An unknown error occurred - see the logs for further details`, components: [] });
      }
    }
  }
}