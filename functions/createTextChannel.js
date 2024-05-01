const {ChannelType } = require('discord.js');
const findTextChannel = require('./findTextChannel');

module.exports = async (textChannel, interaction) => {
  const channelExists = findTextChannel(textChannel.name, interaction);
  if(channelExists){
    return channelExists;
  } else {
    const newTextChannel = await interaction.guild.channels.create({
      name: textChannel.name,
      type: ChannelType.GuildText,
    });
    return newTextChannel;
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject