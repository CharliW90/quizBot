/*
the order of these matters, since they are dependent on one another
they must be called via spyOn from most deeply nested to least nested
*/

exports.registerTeamSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'registerTeamChannel');
exports.setAliasSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'setAlias');
exports.lookupAliasSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'lookupAlias');
exports.deleteTeamSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'deleteTeam');
exports.channelFromTeamSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'channelFromTeam');
exports.teamFromChannelSpy = jest.spyOn(require('../functions/maps/teamChannels'), 'teamFromChannel');