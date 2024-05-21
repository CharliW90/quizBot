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
        const [err, response] = hold();
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`round number was undefined; embeds were undefined; team names were undefined`);
        expect(err.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when not passed arrays for embeds or teamNames', () => {
        const dataObject = {teamName: "data"};
        let [err, response] = hold(roundNum, dataObject, teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`embeds must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(err.loc).toBeDefined();
        expect(response).toBeNull();

        [err, response] = hold(roundNum, embeds, dataObject);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`team names must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(err.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed empty arrays for teams or embeds', () => {
        let [err, response] = hold(roundNum, [], teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`embeds must be provided as an array; received []`);
        expect(err.loc).toBeDefined();
        expect(response).toBeNull();

        [err, response] = hold(roundNum, embeds, []);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`team names must be provided as an array; received []`);
        expect(err.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error if number of teams does not match number of embeds', () => {
        const [err, response] = hold(roundNum, embeds, teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`mismatch between team names and embeds received`);
        expect(err.details).toMatchObject({embeds, teamNames});
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
        const [err, response] = output;
        expect(err).toBeNull();
        expect(response).not.toBeNull();
        expect(response).toEqual(`holding responses for ${teamNames.length} teams, round ${roundNum}`);
      })

      test('returns success for storing single embed and team', () => {
        const roundNum = 3;
        const teamNames = [data.botHeldEmbeds.teams[0]]
        const embeds = [data.botHeldEmbeds.embeds[0]]

        const output = hold(roundNum, embeds, teamNames);
        const [err, response] = output;
        expect(err).toBeNull();
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
        const [err, response] = output;
        expect(response).toBeNull();
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(`could not find a stored round for round number ${roundNum}`);
        expect(err.loc).toBeDefined();
      })

      test('returns an embed message if round number is stored', () => {
        const input = hold(roundNum, embeds, teamNames);
        const output = heldResponses(roundNum);
        const [err, response] = output;
        expect(err).toBeNull();
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
        const [err, response] = output;
        expect(response).toBeNull();
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(`did not find any stored rounds`)
        expect(err.loc).toBeDefined();
      })

      test('returns an embed message if at least one round is stored', () => {
        const [inputErr, inputResponse] = hold(roundNums[0], [embeds[0]], [teamNames[0]]);
        expect(inputErr).toBeNull();
        expect(inputResponse).toEqual(`holding responses for 1 teams, round ${roundNums[0]}`)
        const [err, response] = heldResponses();
        expect(err).toBeNull();
        expect(response).toBeInstanceOf(EmbedBuilder);
        expect(response).toEqual(data.botSummaryEmbed);
      })

      test('returns an embed message if multiple rounds are stored', () => {
        roundNums.forEach((num) => {
          const [inputErr, inputResponse] = hold(num, embeds, teamNames);
          expect(inputErr).toBeNull();
          expect(inputResponse).toEqual(`holding responses for ${teamNames.length} teams, round ${num}`)
        })
        const [err, response] = heldResponses();
        expect(err).toBeNull();
        expect(response).toBeInstanceOf(EmbedBuilder);
        expect(response).toEqual(data.botSummaryEmbed);
        const rounds = [...response.data.fields];
        const totals = rounds.shift();
        expect(totals).toEqual({"name": "Rounds Completed", "value": String(roundNums.length)});
        expect(rounds).toHaveLength(roundNums.length);
      })
    })
  })
})