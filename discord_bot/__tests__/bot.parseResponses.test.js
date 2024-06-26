const { EmbedBuilder, embedLength } = require('discord.js');
const data = require('../__data__');
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
        expect(error.details).toEqual({...input, loc: expect.any(String)});
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
      test('parses a single round of data into embeds for each team', () => {
        const input = mockData[0]

        const {error, response} = parse(input);

        expect(error).toBeNull();
        expect(response).toBeInstanceOf(Object);
        expect(response).toHaveProperty('embedMessages')
        expect(response).toHaveProperty('roundNum')
        expect(response).toHaveProperty('teams')
        const {embedMessages, roundNum, teams} = response;
        expect(embedMessages).toHaveLength(Object.keys(input.results).length);
        expect(roundNum).toEqual(input.roundDetails.number)
        expect(teams).toEqual(Object.keys(input.results))
      })
    })
  })
})