exports.holdSpy = jest.spyOn(require('../functions/forms/holdFormResponses'), 'hold');
exports.heldResponsesSpy = jest.spyOn(require('../functions/forms/holdFormResponses'), 'heldResponses');
exports.parseSpy = jest.spyOn(require('../functions/forms/parseFormResponses'), 'parse');

exports.registerTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'registerTeamChannel');
exports.setAlias = jest.spyOn(require('../functions/maps/teamChannels'), 'setAlias');
exports.deleteTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'deleteTeam');
exports.channelFromTeam = jest.spyOn(require('../functions/maps/teamChannels'), 'channelFromTeam');
exports.teamFromChannel = jest.spyOn(require('../functions/maps/teamChannels'), 'teamFromChannel');