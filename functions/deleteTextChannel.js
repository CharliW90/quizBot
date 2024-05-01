const findTextChannel = require('./findTextChannel');

module.exports = async (interaction, textChannel, reason) => {
  const channelExists = findTextChannel(interaction, textChannel.name);
  if(channelExists){
    const deletedTextChannel = await channelExists.delete(reason)
    return {error: null, channel: deletedTextChannel};
  } else {
    return {error: `Cannot find a channel with the name ${textChannel.name}`};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message