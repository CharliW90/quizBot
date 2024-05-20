const { EmbedBuilder, embedLength } = require('discord.js');
const data = require('../__data__');
const {holdSpy} = require('../__mocks__/spies'); // note: spies must be called before declaring the function they will be called by

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
        const output = parse();
        const [err, response] = output;
        expect(err.code).toEqual(404);
        expect(err.message).toEqual("forms API response is undefined");
        expect(response).toBeNull();
      })

      test('returns an error when passed incorrect data', () => {
        const input = {"data": "this is not correct data"}
        const output = parse(input);
        const [err, response] = output;
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`forms API response malformed`);
        expect(err.details).toEqual(input);
        expect(response).toBeNull();
      })

      test('returns an error when passed data missing results', () => {
        const input = {"roundDetails": {"data": "object"}}
        const output = parse(input);
        const [err, response] = output;
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`forms API response results were undefined`);
        expect(err.details).toBeUndefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed data missing roundDetails', () => {
        const input = {"results": {"data": "object"}}
        const output = parse(input);
        const [err, response] = output;
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`forms API response roundDetails were undefined`);
        expect(err.details).toBeUndefined();
        expect(response).toBeNull();
      })

      test('returns an error when passed data of incorrect types', () => {
        let input = {"roundDetails": "this is a string", "results": {"data": "object"}}
        let output = parse(input);
        let [err, response] = output;
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`forms API response roundDetails were ${JSON.stringify(input.roundDetails)}`);
        expect(err.details).toBeUndefined();
        expect(response).toBeNull();

        input = {"roundDetails": {"data": "object"}, "results": "this is a string"}
        output = parse(input);
        [err, response] = output;
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`forms API response results were ${JSON.stringify(input.results)}`);
        expect(err.details).toBeUndefined();
        expect(response).toBeNull();
      })

      test('returns an error when results object is empty', () => {
        input = {"roundDetails": {"data": "object"}, "results": {}}
        output = parse(input);
        [err, response] = output;
        expect(err.code).toEqual(404);
        expect(err.message).toEqual(`forms API response results ${JSON.stringify(input.results)} does not contain any teams`);
        expect(err.details).toBeUndefined();
        expect(response).toBeNull();
      })
    })
    describe('parses correct data', () => {
      test('parses a single round of data, and holds the team embeds when asked to', () => {
        const input = mockData[0]
        const teams = Object.keys(input.results)

        const output = parse(input, true);
        const [err, response] = output;

        expect(err).toBeNull();
        expect(response).toEqual(`holding responses for ${teams.length} teams, round ${input.roundDetails.number}`)
        expect(holdSpy).toHaveBeenCalledTimes(1);
        expect(holdSpy).toHaveBeenCalledWith(input.roundDetails.number, expect.any(Array), teams)
      })
      
      test('parses a single round of data, and returns embeds for each team when not asked to hold them', () => {
        const input = mockData[0]
        const teams = Object.keys(input.results)

        const output = parse(input, false);
        const [err, response] = output;

        expect(err).toBeNull();
        expect(holdSpy).not.toHaveBeenCalled();
        expect(response).toHaveLength(teams.length);
        response.forEach((teamEmbed, index) => {
          expect(teamEmbed).toBeInstanceOf(EmbedBuilder);
          expect(teamEmbed.data.title).toEqual(teams[index]);
          expect(teamEmbed.data.author.name).toEqual(`Virtual Quizzes - Round Number ${input.roundDetails.number}`)
          const totals = teamEmbed.data.fields.shift();
          expect(totals).toMatchObject({"name": "Total Score", "value": expect.any(String)});
          expect(teamEmbed.data.fields).toHaveLength(input.roundDetails.questions);
        })
      })
    })

  })
})