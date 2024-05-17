const { EmbedBuilder } = require("discord.js");
const data = require('../__data__');

const { registerTeamChannel, deleteTeam } = require("../functions/maps/teamChannels");

const sendFormResponses = require('../functions/forms/sendFormResponses');
const {mockTextChannel} = require("../__mocks__/textChannels");

const mockedChannel = mockTextChannel('teamName', '123-456');

console.log(mockedChannel)

describe('sendFormResponses.js', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    deleteTeam("teamName");
    deleteTeam("another");
    deleteTeam("a_third")
  })

  test('returns an empty object when passed no data', () => {
    sendFormResponses([])
    .then((output) => {
      expect(output).toEqual([]);
    })
  })

  test('sends a message to a channel matching the teamName, when passed a single round of embeds and a teamname', () => {
    registerTeamChannel("teamName", mockedChannel);
    sendFormResponses([data.botHeldEmbeds], "teamName");
    // expect(mockedChannel.send).toHaveBeenCalledTimes(1);
  })

  test('sends embeds to each team channel, when passed a single round of embeds and no teamname', () => {
    registerTeamChannel("teamName", mockedChannel);
    registerTeamChannel("another", mockedChannel);
    registerTeamChannel("a_third", mockedChannel);
    sendFormResponses([data.botHeldEmbeds]);
    expect(mockedChannel.send).toHaveBeenCalledTimes(3);
    data.botHeldEmbeds.embeds.forEach((embed) => {
      expect(mockedChannel.send).toHaveBeenCalledWith(embed)
    })
  })

  test('returns accurate success and failure information when teams cannot be found', () => {
    registerTeamChannel("teamName", mockedChannel);
    registerTeamChannel("a_third", mockedChannel);
    sendFormResponses([data.botHeldEmbeds])
    .then((response) => {
      expect(response[0].successes).toHaveLength(2);
      expect(response[0].successes).toEqual(["teamName", "a_third"]);
      expect(response[0].failures).toHaveLength(1);
      expect(response[0].failures).toEqual(["another"]);
    })
    expect(mockedChannel.send).toHaveBeenCalledTimes(2);
    data.botHeldEmbeds.embeds.forEach((embed) => {
      if(embed.data.title === "teamName" || embed.data.title === "a_third"){
        expect(mockedChannel.send).toHaveBeenCalledWith(embed)
      } else if(embed.data.title === "another"){
        expect(mockedChannel.send).not.toHaveBeenCalledWith(embed)
      }
    })
  })
})