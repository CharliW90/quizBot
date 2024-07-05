const { Events, ActivityType } = require('discord.js');
const logger = require('../logger');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
    client.user.setPresence({
      activities: [{ name: 'Virtual Quizzes', url: 'https://www.twitch.tv/jorosar', type: ActivityType.Streaming}],
      status: 'online'
    });
		logger.info(`Ready! Logged in as ${client.user.tag}`);
    const {error, response} = prepQuizEnvironment(client)
    if(error){
      logger.error(error);
    }
    if(response.length > 0){
      response.forEach((actionTaken) => {
        logger.info(actionTaken);
      });
    }
	},
};