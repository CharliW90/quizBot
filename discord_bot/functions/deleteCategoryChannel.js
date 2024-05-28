const findCategoryChannel = require('./findCategoryChannel');

module.exports = async (interaction, categoryChannel, reason) => {
  const channelExists = findCategoryChannel(interaction, categoryChannel.name);
  if(channelExists){
    const deletedChannel = await channelExists.delete(reason)
    return {error: null, channel: deletedChannel};
  } else {
    return {error: `Cannot find a channel with the name ${categoryChannel.name}`};
  }
}

// checks if the requested channel name already exists, and deletes it if it does
// returns either the deleted channelObject, or the error message