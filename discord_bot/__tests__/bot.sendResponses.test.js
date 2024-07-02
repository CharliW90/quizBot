const data = require('../__data__');
const quizDateSpy = jest.spyOn(require('../database'), 'quizDate').mockImplementation(() => {return {code: '1990-01-12', name: 'test-data'}})
// Note: any change to quizDate() output for testing needs to be reflected in the mocked interaction method: getString()
const { mockInteraction } = require('../__mocks__/interaction');
const { mockTextChannel } = require("../__mocks__/channelText");
const { recordTeam, deleteTeam } = require('../functions/firestore');
const { mockTeam } = require('../__mocks__/team');

let interaction = mockInteraction('test-database');

const embedTeamNames = data.botHeldEmbeds.embeds.map((embed) => {return embed.title});

/*    !!! <WARNING> !!!
these tests connect to, and store data in, the live firebase firestore - 
they do so under a server called 'test-database' thanks to the guildId in
interaction (above); this stored data does not need to be cleared after
it is created, but it also does no harm if it is cleared.
*/

describe('sendFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    interaction = mockInteraction('test-database');
  })

  test('returns an error when passed no interaction to work from', async () => {
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const {error, response} = await sendResponses(undefined, {embeds: []});
    expect(response).toBeNull();
    expect(error.code).toEqual(400)
    expect(error.message).toEqual(`requires valid interaction: \n${undefined}`)
  })

  test('returns an error when passed no embeds to work from', async () => {
    const { sendResponses } = require('../functions/forms/sendFormResponses');
    const {error, response} = await sendResponses(interaction, undefined);
    expect(response).toBeNull();
    expect(error.message).toEqual(`held responses were ${undefined}`)
    expect(error.code).toEqual(400)
  })

  test('sends an embed to a channel matching the teamName, when passed a single round of embeds and a teamname', async () => {
    const { EmbedBuilder } = require('discord.js');
    const { sendResponses } = require('../functions/forms/sendFormResponses');

    const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
    const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
    const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');

    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[1].title, channels: {textChannel: mockedChannelB}}));
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));

    expect(quizDateSpy).toHaveBeenCalledTimes(3);

    interaction.guild.channels.set(mockedChannelA);
    interaction.guild.channels.set(mockedChannelB);
    interaction.guild.channels.set(mockedChannelC);

    const {error, response} = await sendResponses(interaction, data.botHeldEmbeds, "teamName");

    expect(error).toBeNull();
    expect(response).toBeInstanceOf(EmbedBuilder);
    expect(response.data.fields).toHaveLength(1);
    expect(response.data.fields[0]).toHaveProperty("name")
    expect(response.data.fields[0]).toHaveProperty("value")
    expect(response.data.fields[0].name).toEqual(":white_check_mark: Successfully posted results for:")
    expect(response.data.fields[0].value).toEqual("teamName")

    expect(quizDateSpy).toHaveBeenCalledTimes(3);
    // shouldn't be being called again, since our interaction does include a getString('date') and therefore session !== null

    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    const correctEmbed = data.botHeldEmbeds.embeds.filter((embed) => {return embed.title === "teamName"});
    expect(mockedChannelA.send).toHaveBeenCalledWith({embeds: correctEmbed});
    expect(mockedChannelB.send).not.toHaveBeenCalled();
    expect(mockedChannelC.send).not.toHaveBeenCalled();
  })

  test('sends an embed to each team channel, when passed a single round of embeds and no teamname', async () => {
    const { EmbedBuilder } = require('discord.js');
    const { sendResponses } = require('../functions/forms/sendFormResponses')

    const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
    const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
    const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');

    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[1].title, channels: {textChannel: mockedChannelB}}));
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));

    expect(quizDateSpy).toHaveBeenCalledTimes(3);

    interaction.guild.channels.set(mockedChannelA);
    interaction.guild.channels.set(mockedChannelB);
    interaction.guild.channels.set(mockedChannelC);

    const {error, response} = await sendResponses(interaction, data.botHeldEmbeds);

    expect(error).toBeNull();
    expect(response).toBeInstanceOf(EmbedBuilder);
    expect(response.data.fields).toHaveLength(1);
    expect(response.data.fields[0]).toHaveProperty("name")
    expect(response.data.fields[0]).toHaveProperty("value")
    expect(response.data.fields[0].name).toEqual(":white_check_mark: Successfully posted results for:")
    expect(response.data.fields[0].value).toEqual(`${embedTeamNames.join('\n')}`)

    expect(quizDateSpy).toHaveBeenCalledTimes(3);
    // shouldn't be being called again, since our interaction does include a getString('date') and therefore session !== null

    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelA.send).toHaveBeenCalledWith({embeds: [data.botHeldEmbeds.embeds[0]]});

    expect(mockedChannelB.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelB.send).toHaveBeenCalledWith({embeds: [data.botHeldEmbeds.embeds[1]]});

    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelC.send).toHaveBeenCalledWith({embeds: [data.botHeldEmbeds.embeds[2]]});
  })

  test('returns accurate success and failure information about which teams can / cannot be found', async () => {
    const { EmbedBuilder } = require('discord.js');
    const { sendResponses } = require('../functions/forms/sendFormResponses');
    
    const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
    const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
    const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');
    
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
    await deleteTeam(interaction.guildId,data.botHeldEmbeds.embeds[1].title);
    await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));
    
    expect(quizDateSpy).toHaveBeenCalledTimes(3);

    interaction.guild.channels.set(mockedChannelA);
    interaction.guild.channels.set(mockedChannelB); // no registered team for this (see deleteTeam above) but we want channel to exist (see additional error fields below)
    interaction.guild.channels.set(mockedChannelC);

    const {error, response} = await sendResponses(interaction, data.botHeldEmbeds);
    expect(error).toBeNull();
    expect(response).toBeInstanceOf(EmbedBuilder);
    expect(response.data.fields).toHaveLength(3);
    response.data.fields.forEach((field) => {
      expect(field).toHaveProperty("name")
      expect(field).toHaveProperty("value")

    })
    expect(response.data.fields[0].name).toEqual(":white_check_mark: Successfully posted results for:");
    expect(response.data.fields[0].value).toEqual(`${embedTeamNames[0]}\n${embedTeamNames[2]}`);
    expect(response.data.fields[1].name).toEqual(":x: Failed to post results for:");
    expect(response.data.fields[1].value).toEqual(`${embedTeamNames[1]}`);
    expect(response.data.fields[2].name).toEqual(":warning: Registered teams did not receive results:");
    expect(response.data.fields[2].value).toEqual(mockedChannelB.toString());

    expect(quizDateSpy).toHaveBeenCalledTimes(3);
    // shouldn't be being called again, since our interaction does include a getString('date') and therefore session !== null

    expect(mockedChannelA.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelA.send).toHaveBeenCalledWith({embeds: [data.botHeldEmbeds.embeds[0]]});

    expect(mockedChannelB.send).not.toHaveBeenCalled();

    expect(mockedChannelC.send).toHaveBeenCalledTimes(1);
    expect(mockedChannelC.send).toHaveBeenCalledWith({embeds: [data.botHeldEmbeds.embeds[2]]});
  })

  describe('handles errors from dependencies', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      interaction = mockInteraction('test-database');
    });

    test('handles errors from the findChildrenOfCategory() function', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockErrorMsg = {message: "this would be an unhelpful error message", code: 500, guild: {}}
      const findChildrenOfCategory = jest.spyOn(require('../functions/discord'), 'findChildrenOfCategory').mockImplementation(() => {return {error: mockErrorMsg, response: null}})
      const { EmbedBuilder } = require('discord.js');
      const { sendResponses } = require('../functions/forms/sendFormResponses');
      
      const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
      const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
      const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');
      
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[1].title, channels: {textChannel: mockedChannelB}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));
      
      interaction.guild.channels.set(mockedChannelA);
      interaction.guild.channels.set(mockedChannelB);
      interaction.guild.channels.set(mockedChannelC);

      expect(findChildrenOfCategory).not.toHaveBeenCalled();
      /* not used in earlier tasks of registering teams - if this fails, acts as a canary that
      the test fail is due to a change in how we register teams, not how this function works */

      const {error, response} = await sendResponses(interaction, data.botHeldEmbeds);

      expect(error).toBeNull();
      expect(findChildrenOfCategory).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockErrorMsg);

      expect(response).toBeInstanceOf(EmbedBuilder);
      expect(response.data.fields).toHaveLength(2);
      expect(response.data.fields[0]).toHaveProperty("name");
      expect(response.data.fields[0]).toHaveProperty("value");
      expect(response.data.fields[0].name).toEqual(":white_check_mark: Successfully posted results for:");
      expect(response.data.fields[0].value).toEqual(`${embedTeamNames.join('\n')}`);
      expect(response.data.fields[1]).toHaveProperty("name");
      expect(response.data.fields[1]).toHaveProperty("value");
      expect(response.data.fields[1].name).toEqual(":warning: Failed to find category for Quiz Teams channels");
      expect(response.data.fields[1].value).toEqual(mockErrorMsg.message);
    })

    test('handles errors from the getTeam() function', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockErrorMsg = {message: "this would not be a useful error message either", loc: "firestore/quiz.js", code: 500}
      const getTeam = jest.spyOn(require('../functions/firestore'), 'getTeam').mockImplementation(() => {return {error: mockErrorMsg, response: null}})
      const { EmbedBuilder } = require('discord.js');
      const { sendResponses } = require('../functions/forms/sendFormResponses');
      
      const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
      const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
      const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');
      
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[1].title, channels: {textChannel: mockedChannelB}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));
      
      interaction.guild.channels.set(mockedChannelA);
      interaction.guild.channels.set(mockedChannelB);
      interaction.guild.channels.set(mockedChannelC);

      expect(getTeam).not.toHaveBeenCalled();
      /* not used in earlier tasks of registering teams - if this fails, acts as a canary that
      the test fail is due to a change in how we register teams, not how this function works */

      const {error, response} = await sendResponses(interaction, data.botHeldEmbeds);

      expect(error).toBeNull();
      expect(getTeam).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockErrorMsg);

      expect(response).toBeInstanceOf(EmbedBuilder);
      expect(response.data.fields).toHaveLength(2);
      expect(response.data.fields[0]).toHaveProperty("name");
      expect(response.data.fields[0]).toHaveProperty("value");
      expect(response.data.fields[0].name).toEqual(":x: Failed to post results for:");
      expect(response.data.fields[0].value).toEqual(`${embedTeamNames.join('\n')}`);
      expect(response.data.fields[1]).toHaveProperty("name");
      expect(response.data.fields[1]).toHaveProperty("value");
      expect(response.data.fields[1].name).toEqual(":warning: Registered teams did not receive results:");
      expect(response.data.fields[1].value).toEqual(`#${mockedChannelA.name}\n#${mockedChannelB.name}\n#${mockedChannelC.name}`);
    })

    test('handles errors from the lookupAlias() function', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockErrorMsg = {message: "this would also be a terrible error message", code: 500}
      const lookupAlias = jest.spyOn(require('../functions/firestore'), 'lookupAlias').mockImplementation(() => {return Promise.resolve({error: mockErrorMsg, response: null})})
      const { EmbedBuilder } = require('discord.js');
      const { sendResponses } = require('../functions/forms/sendFormResponses');

      const mockedChannelA = mockTextChannel(data.botHeldEmbeds.embeds[0].title, '123-456');
      const mockedChannelB = mockTextChannel(data.botHeldEmbeds.embeds[1].title, '456-789');
      const mockedChannelC = mockTextChannel(data.botHeldEmbeds.embeds[2].title, '789-123');
      
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[0].title, channels: {textChannel: mockedChannelA}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[1].title, channels: {textChannel: mockedChannelB}}));
      await recordTeam(interaction.guildId, mockTeam({teamName: data.botHeldEmbeds.embeds[2].title, channels: {textChannel: mockedChannelC}}));
      
      interaction.guild.channels.set(mockedChannelA);
      interaction.guild.channels.set(mockedChannelB);
      interaction.guild.channels.set(mockedChannelC);

      expect(lookupAlias).not.toHaveBeenCalled();
      /* not used in earlier tasks of registering teams - if this fails, acts as a canary that
      the test fail is due to a change in how we register teams, not how this function works */

      const {error, response} = await sendResponses(interaction, data.botHeldEmbeds);
      expect(error).toBeNull();
      expect(lookupAlias).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockErrorMsg);

      expect(response).toBeInstanceOf(EmbedBuilder);
      expect(response.data.fields).toHaveLength(1);
      expect(response.data.fields[0]).toHaveProperty("name");
      expect(response.data.fields[0]).toHaveProperty("value");
      expect(response.data.fields[0].name).toEqual(":white_check_mark: Successfully posted results for:");
      expect(response.data.fields[0].value).toEqual(`${embedTeamNames.join('\n')}`);
    })
  })
})