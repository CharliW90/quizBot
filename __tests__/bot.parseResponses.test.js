const { EmbedBuilder, embedLength } = require('discord.js');
const data = require('../__data__');
const {holdSpy} = require('../__mocks__/functionSpies'); // note: spies must be called before declaring the function they will be called by

const {parse} = require('../functions/forms/parseFormResponses');

const mockData = data.apiResponses;

describe('parseFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  describe('parse()', () => {
    describe('returns an error when passed incorrect data', () => {
      test('returns an error when passed no data', () => {
        const {error, response} = parse();
        expect(error.code).toEqual(404);
        expect(error.message).toEqual("forms API data is undefined");
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed incorrect data', () => {
        const input = {"data": "this is not correct data"}
        const {error, response} = parse(input);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`forms API data malformed`);
        expect(error.details).toEqual({...input, "loc": expect.any(String)});
        expect(response).toBeNull();
      })

      test('returns an error when passed data missing results', () => {
        const input = {"roundDetails": {"data": "object"}}
        const {error, response} = parse(input);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`forms API data results were undefined`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed data missing roundDetails', () => {
        const input = {"results": {"data": "object"}}
        const {error, response} = parse(input);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`forms API data roundDetails were undefined`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed data of incorrect types', () => {
        let input = {"roundDetails": "this is a string", "results": {"data": "object"}}
        let {error, response} = parse(input);
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`forms API data roundDetails were ${JSON.stringify(input.roundDetails)}`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();

        input = {"roundDetails": {"data": "object"}, "results": "this is a string"}
        output = parse(input);
        ({error, response} = parse(input));
        expect(error.code).toEqual(400);
        expect(error.message).toEqual(`forms API data results were ${JSON.stringify(input.results)}`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })

      test('returns an error when results object is empty', () => {
        input = {"roundDetails": {"data": "object"}, "results": {}}
        output = parse(input);
        ({error, response} = parse(input));
        expect(error.code).toEqual(404);
        expect(error.message).toEqual(`forms API data results ${JSON.stringify(input.results)} does not contain any teams`);
        expect(error.loc).toBeDefined();
        expect(response).toBeNull();
      })
    })
    describe('parses correct data', () => {
      test('parses a single round of data, and holds the team embeds when asked to', () => {
        const input = mockData[0]
        const teams = Object.keys(input.results)

        const {error, response} = parse(input, true);

        expect(error).toBeNull();
        expect(response).toEqual(`holding responses for ${teams.length} teams, round ${input.roundDetails.number}`)
        expect(holdSpy).toHaveBeenCalledTimes(1);
        expect(holdSpy).toHaveBeenCalledWith(input.roundDetails.number, expect.any(Array), teams)
      })
      
      test('parses a single round of data, and returns embeds for each team when not asked to hold them', () => {
        const input = mockData[0]
        const teams = Object.keys(input.results)

        const {error, response} = parse(input, false);

        expect(error).toBeNull();
        expect(holdSpy).not.toHaveBeenCalled();
        expect(response).toHaveLength(teams.length);
        response.forEach((teamEmbed, index) => {
          expect(teamEmbed).toBeInstanceOf(EmbedBuilder);
          expect(teamEmbed).toEqual(data.botRoundEmbed(input.roundDetails.number, teams[index]));
          const rounds = [...teamEmbed.data.fields];
          const totals = rounds.shift();
          expect(totals).toEqual({"name": "Total Score", "value": expect.stringMatching(/(^\d+\ \/\ \d+$)/)});
          expect(rounds).toHaveLength(input.roundDetails.questions);
        })
      })
    })

  })
})