/*
the order of these matters, since they are dependent on one another
they must be called via spyOn from most deeply nested to least nested
*/

exports.registerTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'registerTeamChannel');
exports.setAlias = jest.spyOn(require('../functions/maps/teamChannels'), 'setAlias');
exports.deleteTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'deleteTeam');
exports.channelFromTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'channelFromTeam');
exports.teamFromChannel = jest.spyOn(require('../functions/maps/teamChannels'), 'teamFromChannel');