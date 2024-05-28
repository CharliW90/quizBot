const { EmbedBuilder } = require('discord.js');
const data = require('../__data__');
const {mockTextChannel} = require("../__mocks__/textChannels");

describe('sendFormResponses.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  })

  test('returns an error when passed no data', async () => {
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const {error, response} = sendResponses([]);
    expect(response).toBeNull();
    expect(error.code).toEqual(400)
  })

  test('sends an embed to a channel matching the teamName, when passed a single round of embeds and a teamname', () => {
    const { channelFromTeamSpy } = require('../__mocks__/mapSpies');
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].data.title, '123-456');
    const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].data.title, '456-789');
    const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].data.title, '789-123');

    registerTeamChannel(data.botHeldEmbeds.embeds[0].data.title, mockedChannelA);
    registerTeamChannel(data.botHeldEmbeds.embeds[1].data.title, mockedChannelB);
    registerTeamChannel(data.botHeldEmbeds.embeds[2].data.title, mockedChannelC);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);
    channelFromTeamSpy.mockClear();

    const {error, response} = sendResponses([data.botHeldEmbeds], "teamName");

    expect(error).toBeNull();
    expect(response[0].successes).toHaveLength(1);
    expect(...response[0].successes).toEqual("teamName".toLowerCase());
    expect(response[0].failures).toHaveLength(0);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(1);
    expect(channelFromTeamSpy).toHaveBeenCalledWith("teamName".toLowerCase());
    expect(channelFromTeamSpy).toHaveReturnedWith({error: null, response: mockedChannelA});

    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    const correctEmbed = data.botHeldEmbeds.embeds.filter((embed) => {return embed.data.title === "teamName"});
    expect(mockedChannelA.send).toHaveBeenCalledWith(correctEmbed);

    expect(mockedChannelB.send).not.toHaveBeenCalled();
    expect(mockedChannelC.send).not.toHaveBeenCalled();
  })

  test('sends an embed to each team channel, when passed a single round of embeds and no teamname', () => {
    const { channelFromTeamSpy } = require('../__mocks__/mapSpies');
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

    const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
    const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
    const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

    registerTeamChannel(embedTeamNames[0], mockedChannelA);
    registerTeamChannel(embedTeamNames[1], mockedChannelB);
    registerTeamChannel(embedTeamNames[2], mockedChannelC);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);
    channelFromTeamSpy.mockClear();

    const {error, response} = sendResponses([data.botHeldEmbeds]);

    expect(error).toBeNull();
    expect(response[0].successes).toHaveLength(3);
    expect(response[0].successes).toEqual([embedTeamNames[0].toLowerCase(), embedTeamNames[1].toLowerCase(), embedTeamNames[2].toLowerCase()]);
    expect(response[0].failures).toHaveLength(0);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(1, embedTeamNames[0].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(1, {error: null, response: mockedChannelA});
    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelA.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[0]);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(2, embedTeamNames[1].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(2, {error: null, response: mockedChannelB});
    expect(mockedChannelB.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelB.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[1]);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(3, embedTeamNames[2].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(3, {error: null, response: mockedChannelC});
    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelC.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[2]);

  })

  test('sends multiple embeds to a channel matching the teamName, when passed multiple rounds of embeds and a teamname', () => {
    const { channelFromTeamSpy } = require('../__mocks__/mapSpies');
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

    const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
    const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
    const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

    registerTeamChannel(embedTeamNames[0], mockedChannelA);
    registerTeamChannel(embedTeamNames[1], mockedChannelB);
    registerTeamChannel(embedTeamNames[2], mockedChannelC);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);
    channelFromTeamSpy.mockClear();

    sendResponses([data.botHeldEmbeds, data.botHeldEmbeds, data.botHeldEmbeds], "teamName");
    
    expect(channelFromTeamSpy).toHaveBeenCalledTimes(1);

    expect(mockedChannelA.send).toHaveBeenCalledTimes(3);
    const correctEmbed = data.botHeldEmbeds.embeds.filter((embed) => {return embed.data.title === "teamName"});
    expect(mockedChannelA.send).toHaveBeenCalledWith(correctEmbed);

    expect(mockedChannelB.send).not.toHaveBeenCalled();
    expect(mockedChannelC.send).not.toHaveBeenCalled();

  })

  test('sends multiple embeds to each team channel, when passed multiple rrounds of embeds and no teamname', () => {
    const { channelFromTeamSpy } = require('../__mocks__/mapSpies');
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

    const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
    const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
    const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

    registerTeamChannel(embedTeamNames[0], mockedChannelA);
    registerTeamChannel(embedTeamNames[1], mockedChannelB);
    registerTeamChannel(embedTeamNames[2], mockedChannelC);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);
    channelFromTeamSpy.mockClear();

    sendResponses([data.botHeldEmbeds, data.botHeldEmbeds, data.botHeldEmbeds]);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(1, embedTeamNames[0].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(1, {error: null, response: mockedChannelA});
    expect(mockedChannelA.send).toHaveBeenCalledTimes(3);
    expect(mockedChannelA.send.mock.calls).toEqual([[data.botHeldEmbeds.embeds[0]], [data.botHeldEmbeds.embeds[0]], [data.botHeldEmbeds.embeds[0]]]);
    
    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(2, embedTeamNames[1].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(2, {error: null, response: mockedChannelB});
    expect(mockedChannelB.send).toHaveBeenCalledTimes(3);
    expect(mockedChannelB.send.mock.calls).toEqual([[data.botHeldEmbeds.embeds[1]], [data.botHeldEmbeds.embeds[1]], [data.botHeldEmbeds.embeds[1]]]);
    
    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(3, embedTeamNames[2].toLowerCase());
    expect(channelFromTeamSpy).toHaveNthReturnedWith(3, {error: null, response: mockedChannelC});
    expect(mockedChannelC.send).toHaveBeenCalledTimes(3);
    expect(mockedChannelC.send.mock.calls).toEqual([[data.botHeldEmbeds.embeds[2]], [data.botHeldEmbeds.embeds[2]], [data.botHeldEmbeds.embeds[2]]]);
  })

  test('returns accurate success and failure information about which teams can / cannot be found', () => {
    const { channelFromTeamSpy } = require('../__mocks__/mapSpies');
    const { registerTeamChannel } = require("../functions/maps/teamChannels");
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

    const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
    const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
    const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

    registerTeamChannel(embedTeamNames[0], mockedChannelA);
    registerTeamChannel(embedTeamNames[2], mockedChannelC);

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(2);
    channelFromTeamSpy.mockClear();

    const {error, response} = sendResponses([data.botHeldEmbeds]);
    expect(error).toBeNull();
    response.forEach((output) => {
      expect(output.successes).toHaveLength(2);
      expect(output.successes).toEqual([embedTeamNames[0].toLowerCase(), embedTeamNames[2].toLowerCase()]);
      expect(output.failures).toHaveLength(1);
      expect(output.failures).toEqual([embedTeamNames[1].toLowerCase()]);
    })

    expect(channelFromTeamSpy).toHaveBeenCalledTimes(3);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(1, embedTeamNames[0].toLowerCase())
    expect(channelFromTeamSpy).toHaveNthReturnedWith(1, {error: null, response: mockedChannelA})
    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelA.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[0]);

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(2, embedTeamNames[1].toLowerCase())
    expect(channelFromTeamSpy).toHaveNthReturnedWith(2, {error: {"code": 404, "message": `${embedTeamNames[1].toLowerCase()} not found`}, response: null})
    expect(mockedChannelB.send).not.toHaveBeenCalled();

    expect(channelFromTeamSpy).toHaveBeenNthCalledWith(3, embedTeamNames[2].toLowerCase())
    expect(channelFromTeamSpy).toHaveNthReturnedWith(3, {error: null, response: mockedChannelC})
    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelC.send).toHaveBeenCalledWith(data.botHeldEmbeds.embeds[2]);
  })

  describe('handles errors from dependencies', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      jest.unmock('../functions/maps/teamChannels');
    });

    test('handles errors from the channelFromTeam() function', () => {
      const mockErrorMsg = {"message": "this would not be a useful error message", "code": 400, "loc": "parse()"}
      const channelFromTeam = jest.spyOn(require("../functions/maps/teamChannels"), 'channelFromTeam').mockImplementation(() => {return {error: mockErrorMsg, response: null}})
      const { registerTeamChannel } = require("../functions/maps/teamChannels");
      const { sendResponses } = require('../functions/forms/sendFormResponses');

      const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

      const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
      const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
      const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

      registerTeamChannel(embedTeamNames[0], mockedChannelA);
      registerTeamChannel(embedTeamNames[1], mockedChannelB);
      registerTeamChannel(embedTeamNames[2], mockedChannelC);

      expect(channelFromTeam).toHaveBeenCalledTimes(3);
      expect(channelFromTeam).toHaveReturnedWith({error: mockErrorMsg, response: null})
      channelFromTeam.mockClear();

      const {error, response} = sendResponses([data.botHeldEmbeds]);
      expect(response).toBeNull();
      expect(error.code).toEqual(500);
      expect(error.message).toEqual(`ERR: "${mockErrorMsg.code}:${mockErrorMsg.message}" from channelFromTeam()`);
      expect(error.loc).toBeDefined();
    })

    test('handles errors from the lookupAlias() function', () => {
      const mockErrorMsg = {"message": "this would also be an unhelpful error message", "code": 500, "loc": "parse()"}
      const lookupAlias = jest.spyOn(require("../functions/maps/teamChannels"), 'lookupAlias').mockImplementation(() => {return {error: mockErrorMsg, response: null}})
      const { registerTeamChannel } = require("../functions/maps/teamChannels");
      const { sendResponses } = require('../functions/forms/sendFormResponses');

      const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.data.title})

      const mockedChannelA = mockTextChannel(embedTeamNames[0], '123-456');
      const mockedChannelB = mockTextChannel(embedTeamNames[1], '456-789');
      const mockedChannelC = mockTextChannel(embedTeamNames[2], '789-123');

      registerTeamChannel(embedTeamNames[0], mockedChannelA);
      registerTeamChannel(embedTeamNames[1], mockedChannelB);
      registerTeamChannel(embedTeamNames[2], mockedChannelC);

      expect(lookupAlias).not.toHaveBeenCalled();

      const {error, response} = sendResponses([data.botHeldEmbeds]);
      expect(response).toBeNull();
      expect(error.code).toEqual(500);
      expect(error.message).toEqual(`ERR: "${mockErrorMsg.code}:${mockErrorMsg.message}" from channelFromTeam()`);
      expect(error.loc).toBeDefined();
    })
  })
})