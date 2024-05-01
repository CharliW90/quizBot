const {ChannelType } = require('discord.js');
const findVoiceChannel = require('./findVoiceChannel');

module.exports = async (voiceChannel, interaction) => {
  const channelExists = findVoiceChannel(voiceChannel.name, interaction);
  if(channelExists){
    return channelExists;
  } else {
    const newvoiceChannel = await interaction.guild.channels.create({
      name: voiceChannel.name,
      type: ChannelType.GuildVoice,
    });
    return newvoiceChannel;
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject