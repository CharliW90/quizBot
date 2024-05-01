const {ChannelType } = require('discord.js');
const findVoiceChannel = require('./findVoiceChannel');

module.exports = async (interaction, voiceChannel) => {
  const channelExists = findVoiceChannel(interaction, voiceChannel.name);
  if(channelExists){
    return {error: "Channel already exists", channel: channelExists};
  } else {
    const newVoiceChannel = await interaction.guild.channels.create({
      name: voiceChannel.name,
      type: ChannelType.GuildVoice,
    });
    return {error: null, channel: newVoiceChannel};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject