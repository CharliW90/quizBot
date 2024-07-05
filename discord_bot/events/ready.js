const { Events, ActivityType } = require('discord.js');
const logger = require('../logger');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
    const localLogger = logger.child({command: false, file: 'events/ready.js', fn: 'execute()'});
    client.user.setPresence({
      activities: [{ name: 'Virtual Quizzes', url: 'https://www.twitch.tv/jorosar', type: ActivityType.Streaming}],
      status: 'online'
    });
		localLogger.info(`Ready! Logged in as ${client.user.tag}`);
    const {error, response} = prepQuizEnvironment(client)
    if(error){
      localLogger.error(error);
    }
    if(response.length > 0){
      response.forEach((actionTaken) => {
        localLogger.info(actionTaken);
      });
    }
	},
};