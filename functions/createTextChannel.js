const {ChannelType } = require('discord.js');
const findTextChannel = require('./findTextChannel');

module.exports = async (interaction, textChannel) => {
  const channelExists = findTextChannel(interaction, textChannel.name);
  if(channelExists){
    return {error: "Channel already exists", channel: channelExists};
  } else {
    const newTextChannel = await interaction.guild.channels.create({
      name: textChannel.name,
      type: ChannelType.GuildText,
    });
    return {error: null, channel: newTextChannel};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject