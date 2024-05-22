const { sendSpy } = require('../__mocks__/functionSpies');

describe('holdFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  describe('hold()', () => {
    const data = require('../__data__');

    describe('returns errors when passed incorrect data', () => {
      const { hold } = require('../functions/forms/holdFormResponses')

      const roundNum = 3;
      const embeds = [data.botRoundEmbed]
      const teamNames = ["teamName", "another", "a_third"];
      
      test('returns an error when passed no data', () => {
        const {error, response} = hold();
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`round number was undefined; embeds were undefined; team names were undefined`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when not passed arrays for embeds or teamNames', () => {
        const dataObject = {teamName: "data"};
        let {error, response} = hold(roundNum, dataObject, teamNames);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`embeds must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();

        ({error, response} = hold(roundNum, embeds, dataObject));
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`team names must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed empty arrays for teams or embeds', () => {
        let {error, response} = hold(roundNum, [], teamNames);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`embeds must be provided as an array; received []`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();

        ({error, response} = hold(roundNum, embeds, []));
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`team names must be provided as an array; received []`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error if number of teams does not match number of embeds', () => {
        const {error, response} = hold(roundNum, embeds, teamNames);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`mismatch between team names and embeds received`);
        expect(error.details).toMatchObject({embeds, teamNames});
        expect(response).toBeNull();
      })
    })

    describe('returns a success response when passed suitable data', () => {
      const { hold } = require('../functions/forms/holdFormResponses')
      
      test('returns success for storing multiple embeds and teams', () => {
        const roundNum = 3;
        const embeds = data.botHeldEmbeds.embeds
        const teamNames = data.botHeldEmbeds.teams

        const output = hold(roundNum, embeds, teamNames);
        const {error, response} = output;
        expect(error).toBeNull();
        expect(response).toEqual(`holding responses for ${teamNames.length} teams, round ${roundNum}`);
      })

      test('returns success for storing single embed and team', () => {
        const roundNum = 3;
        const teamNames = [data.botHeldEmbeds.teams[0]]
        const embeds = [data.botHeldEmbeds.embeds[0]]

        const output = hold(roundNum, embeds, teamNames);
        const {error, response} = output;
        expect(error).toBeNull();
        expect(response).not.toBeNull();
        expect(response).toEqual(`holding responses for ${teamNames.length} teams, round ${roundNum}`);
      })
    })
  })

  describe('heldResponses()', () => {
    describe('handles single round responses', () => {
      jest.resetModules();
      const { EmbedBuilder } = require("discord.js");
      const data = require('../__data__');
      const { hold, heldResponses } = require('../functions/forms/holdFormResponses')

      const roundNum = 3;
      const embeds = data.botHeldEmbeds.embeds;
      const teamNames = data.botHeldEmbeds.teams;

      test('returns an error if round number is not stored', () => {
        const output = heldResponses(roundNum);
        const {error, response} = output;
        expect(response).toBeNull();
        expect(error.code).toEqual(404);
        expect(error.message).toEqual(`could not find a stored round for round number ${roundNum}`);
        expect(error.loc).toBeDefined();
      })

      test('returns an embed message if round number is stored', () => {
        let {error, response} = hold(roundNum, embeds, teamNames);
        expect(error).toBeNull();
        ({error, response} = heldResponses(roundNum));
        expect(error).toBeNull();
        expect(response).toBeInstanceOf(EmbedBuilder);
        expect(response.data.title).toEqual(`Embeds held for retrieval - Round ${roundNum}`);
      })
    })

    describe('handles all round responses', () => {
      jest.resetModules();
      const { EmbedBuilder } = require("discord.js");
      const data = require('../__data__');
      const { hold, heldResponses } = require('../functions/forms/holdFormResponses')

      const roundNums = [1, 2, 3]
      const embeds = data.botHeldEmbeds.embeds
      const teamNames = data.botHeldEmbeds.teams

      test('returns an error if no rounds have been stored', () => {
        const output = heldResponses();
        const {error, response} = output;
        expect(response).toBeNull();
        expect(error.code).toEqual(404);
        expect(error.message).toEqual(`did not find any stored rounds`)
        expect(error.loc).toBeDefined();
      })

      test('returns an embed message if one round is stored', () => {
        let {error, response} = hold(roundNums[0], [embeds[0]], [teamNames[0]]);
        expect(error).toBeNull();
        expect(response).toEqual(`holding responses for 1 teams, round ${roundNums[0]}`);
        ({error, response} = heldResponses());
        expect(error).toBeNull();
        expect(response).toBeInstanceOf(EmbedBuilder);
        expect(response).toEqual(data.botSummaryEmbed);
      })

      test('returns an embed message if multiple rounds are stored', () => {
        roundNums.forEach((num) => {
          const {error, response} = hold(num, embeds, teamNames);
          expect(error).toBeNull();
          expect(response).toEqual(`holding responses for ${teamNames.length} teams, round ${num}`)
        })
        const {error, response} = heldResponses();
        expect(error).toBeNull();
        expect(response).toBeInstanceOf(EmbedBuilder);
        expect(response).toEqual(data.botSummaryEmbed);
        const rounds = [...response.data.fields];
        const totals = rounds.shift();
        expect(totals).toEqual({"name": "Rounds Completed", "value": String(roundNums.length)});
        expect(rounds).toHaveLength(roundNums.length);
      })
    })
  })

  test.todo('how to test the discord follow up buttons?')
})