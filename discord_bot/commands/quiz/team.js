const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { findAdmins, findRole } = require("../../functions/discord");
const teamMemberAdd = require("../../functions/quiz/teamMemberAdd");
const teamMemberRemove = require("../../functions/quiz/teamMemberRemove");
const teamMemberPromote = require("../../functions/quiz/teamMemberPromote");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('manage a team')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-member')
        .setDescription('Add a new member to the team')
        .addStringOption(option => 
          option
            .setName('team')
            .setDescription('The team to modify')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('member')
            .setDescription('The member to add')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('member-2')
            .setDescription('Another member to add')
        )
        .addUserOption(option =>
          option.setName('member-3')
            .setDescription('Another member to add')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-member')
        .setDescription('Remove a member from the team')
        .addStringOption(option => 
          option
            .setName('team')
            .setDescription('The team to modify')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('member')
            .setDescription('The member to remove')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('member-2')
            .setDescription('Another member to remove')
        )
        .addUserOption(option =>
          option.setName('member-3')
            .setDescription('Another member to remove')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('promote-to-captain')
        .setDescription('Promote a team member to team captain')
        .addStringOption(option => 
          option
            .setName('team')
            .setDescription('The team to modify')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('member')
            .setDescription('The member to remove')
            .setRequired(true)
        )
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused();

    const admins = await findAdmins(interaction.guild).response.admins;

    const guildRoles = await interaction.guild.roles.cache.map(role => role);
    const teamRoles = guildRoles.filter((role) => {
      const prefix = role.name.split(' ')[0];
      return prefix === "Team:";
    });

    const userRoles = interaction.member.roles.cache.map(role => role.name);
    const rolesUserCanManage = teamRoles.filter((role) => {
      if(admins.has(interaction.member.id)){
        return true;
      } else {
        return userRoles.includes(role.name);
      }
    })

    const filtered = rolesUserCanManage.filter(choice => choice.name.startsWith(focusedOption));
    await interaction.respond(
      filtered.map(choice => ({ name: choice.name.replace("Team: ", ""), value: choice.name}))
    )
  },
  async execute(interaction) {
    await interaction.deferReply();
    const allMembers = await interaction.guild.members.fetch();
    const admins = await findAdmins(interaction.guild).response.admins;
    const userRoles = interaction.member.roles.cache.map(role => role.name);

    let teamName = interaction.options.getString('team')
    if(!teamName.includes("Team: ")){
      teamName = `Team: ${teamName}`
    }
    ({error, response} = findRole(interaction.guild, `${teamName}`));
    if(error){
      console.error(error);
      interaction.editReply(`Error ${error.code}: ${error.message}`);
      return;
    }
    const teamRole = response;

    ({error, response} = findRole(interaction.guild, `Team Captain`));
    if(error){
      console.error(error);
      interaction.editReply(`Error ${error.code}: ${error.message}`);
      return;
    }
    const captainRole = response;

    //if the user is not an admin, and not the team captain of the team being edited
    if(!admins.has(interaction.member.id) && !(userRoles.includes(captainRole.name) && userRoles.includes(teamName))){
      console.error(`${interaction.user.globalName} is neither an admin, nor a captain of ${teamName}`);
      interaction.editReply(`Error 403: You are not the Team Captain of ${teamName}`);
      return;
    }

    const members = [];
    interaction.options.getMember('member') ? members.push(interaction.options.getMember('member')) : "";
    interaction.options.getMember('member-2') ? members.push(interaction.options.getMember('member-2')) : "";
    interaction.options.getMember('member-3') ? members.push(interaction.options.getMember('member-3')) : "";

    const roleMembers = allMembers.map(member => member).filter(member => member.roles.cache.has(teamRole.id));
    const [teamCaptain] = roleMembers.filter(member => member.roles.cache.has(captainRole.id));
    const teamMembers = roleMembers.filter(member => member !== teamCaptain)

    const confirmation_screen = new EmbedBuilder()
      .setColor(teamRole.color)
      .setTitle("Quiz Team Amendments")
      .setAuthor({name: `QuizBot 2.0`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields(
        {name: `Team Name`, value: teamName},
        {name: `Team Captain`, value: `${teamCaptain}`}
      )
    if(teamMembers.length > 0){
      confirmation_screen.addFields({name: `Members`, value: teamMembers.join('\n')})
    }
    confirmation_screen.addFields({name: `${interaction.options.getSubcommand().replace("-", " ")}`, value: members.join('\n')})

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

    const popup = await interaction.channel.send({embeds: [confirmation_screen]});

    await interaction.editReply({
      content: 'Please review your amendments, and confirm the details for me'
    });

    const confirmation = await interaction.channel.send({components: [row]})

    const collectorFilter = i => i.user.id === interaction.user.id;

    try{
      const reply = await confirmation.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

      if(reply.customId === 'cancel'){
        interaction.editReply({ content: `Action cancelled.` });
        interaction.channel.messages.delete(popup);
        confirmation.delete();
        return;
      } else if(reply.customId === 'confirm'){
        if (interaction.options.getSubcommand() === 'add-member') {
          const {error, response} = teamMemberAdd(teamRole, members)
          if(error){
            console.error(error)
          }
          interaction.editReply(`Done.`);
          interaction.channel.messages.delete(popup);
          confirmation.delete();
        }
        if (interaction.options.getSubcommand() === 'remove-member') {
          const {error, response} = teamMemberRemove(teamRole, members)
          if(error){
            console.error(error)
          }
          interaction.editReply(`Done.`);
          interaction.channel.messages.delete(popup);
          confirmation.delete();
        }
        if (interaction.options.getSubcommand() === 'promote-to-captain') {
          const [newCaptain] = members
          const {error, response} = teamMemberPromote(teamCaptain, newCaptain, captainRole)
          if(error){
            console.error(error);
            throw error;
          }
          interaction.editReply(response);
          interaction.channel.messages.delete(popup);
          confirmation.delete();
        }
      }
    } catch(e) {
      console.error("team error handler:\nERR =>", e);
      await interaction.editReply({ content: `An unknown error occurred - see the logs for further details`, components: [] });
    }
  }
}