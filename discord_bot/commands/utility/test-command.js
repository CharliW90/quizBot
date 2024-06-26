const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");

module.exports = {
  category: 'utility',
	data: new SlashCommandBuilder()
		.setName('test-command')
		.setDescription('test something'),
	async execute(interaction) {
    console.log("NEW TEST")
    await interaction.deferReply();

  const top = "https://cdn.discordapp.com/attachments/1250390976829067268/1250467682663272601/top.png?"
  const first = "https://cdn.discordapp.com/attachments/1250390976829067268/1250467682986496192/first.png?"
  const second = "https://cdn.discordapp.com/attachments/1250390976829067268/1250467683288223864/second.png"
  const third = "https://cdn.discordapp.com/attachments/633268964662968320/1250470326694055957/third.png"
  const poop = "https://cdn.discordapp.com/attachments/1250390976829067268/1250467506779586660/poop.png"


    const tester = new EmbedBuilder()
      .setColor('Green')
      .setTitle("TESTER")
      .setAuthor({name: `Virtual Quizzes - TESTER`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields({name: "Total Score", value: `100 / 10`})
      .setThumbnail(top)

    await interaction.channel.send({embeds: [tester]})

    await interaction.editReply('tested...');
	}
};