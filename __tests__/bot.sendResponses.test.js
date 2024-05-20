const data = require('../__data__');
const {mockTextChannel} = require("../__mocks__/textChannels");

describe('sendFormResponses.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  })

  test('returns an empty object when passed no data', () => {
    const sendFormResponses = require('../functions/forms/sendFormResponses');

    sendFormResponses([])
    .then((output) => {
      expect(output).toEqual([]);
    })
  })

  test('sends a message to a channel matching the teamName, when passed a single round of embeds and a teamname', () => {
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const sendFormResponses = require('../functions/forms/sendFormResponses');

    const mockedChannel = mockTextChannel('teamName', '123-456');

    registerTeamChannel("teamName", mockedChannel);
    sendFormResponses([data.botHeldEmbeds], "teamName");
    expect(mockedChannel.send).toHaveBeenCalledTimes(1);
  })

  test('sends embeds to each team channel, when passed a single round of embeds and no teamname', () => {
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const sendFormResponses = require('../functions/forms/sendFormResponses');

    const mockedChannelA = mockTextChannel('teamName', '123-456');
    const mockedChannelB = mockTextChannel('another', '456-789');
    const mockedChannelC = mockTextChannel('a_third', '789-123');

    registerTeamChannel("teamName", mockedChannelA);
    registerTeamChannel("another", mockedChannelB);
    registerTeamChannel("a_third", mockedChannelC);
    sendFormResponses([data.botHeldEmbeds]);
    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelA.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[0]);
    expect(mockedChannelB.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelB.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[1]);
    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelC.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[2]);
  })

  test('returns accurate success and failure information when teams cannot be found', () => {
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const sendFormResponses = require('../functions/forms/sendFormResponses');

    const mockedChannelA = mockTextChannel('teamName', '123-456');
    const mockedChannelB = mockTextChannel('another', '456-789');
    const mockedChannelC = mockTextChannel('a_third', '789-123');

    registerTeamChannel("teamName", mockedChannelA);
    registerTeamChannel("a_third", mockedChannelC);

    sendFormResponses([data.botHeldEmbeds])
    .then((response) => {
      expect(response[0].successes).toHaveLength(2);
      expect(response[0].successes).toEqual(["teamName", "a_third"]);
      expect(response[0].failures).toHaveLength(1);
      expect(response[0].failures).toEqual(["another"]);
    })
    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelB.send).not.toHaveBeenCalled();
    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    data.botHeldEmbeds.embeds.forEach((embed) => {
      if(embed.data.title === "teamName"){
        expect(mockedChannelA.send).toHaveBeenCalledWith(embed);
      }
      if(embed.data.title === "a_third"){
        expect(mockedChannelC.send).toHaveBeenCalledWith(embed);
      }
      if(embed.data.title === "another"){
        expect(mockedChannelB.send).not.toHaveBeenCalledWith(embed)
      }
    })
  })
})