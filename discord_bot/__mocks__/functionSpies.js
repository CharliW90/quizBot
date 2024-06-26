/*
the order of these matters, since they are dependent on one another
they must be called via spyOn from most deeply nested to least nested
i.e. fetchFormResponses calls both parseFormResponses and holdFormResponses
so must be spied on after those have been spied on - similarly parse calls hold, and so on
*/

exports.sendSpy = jest.spyOn(require('../functions/forms/sendFormResponses'), 'sendResponses');

exports.holdSpy = jest.spyOn(require('../functions/forms/holdFormResponses'), 'hold');
exports.followUpSpy = jest.spyOn(require('../functions/forms/holdFormResponses'), 'followUp');

exports.parseSpy = jest.spyOn(require('../functions/forms/parseFormResponses'), 'parse');

exports.fetchSpy = jest.spyOn(require('../functions/forms/fetchFormResponses'), 'fetch')
exports.summariseSpy = jest.spyOn(require('../functions/forms/fetchFormResponses'), 'summarise')