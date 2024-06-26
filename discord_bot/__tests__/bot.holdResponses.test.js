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
        expect(response).toEqual({roundNum, teams: teamNames.map(name => name.toLowerCase())});
      })

      test('returns success for storing single embed and team', () => {
        const roundNum = 3;
        const teamNames = [data.botHeldEmbeds.teams[0]]
        const embeds = [data.botHeldEmbeds.embeds[0]]

        const output = hold(roundNum, embeds, teamNames);
        const {error, response} = output;
        expect(error).toBeNull();
        expect(response).not.toBeNull();
        expect(response).toEqual({roundNum, teams: teamNames.map(name => name.toLowerCase())});
      })
    })

    describe('handles errors from dependencies', () => {
      test('handles errors from the sendResponses() function', () => {

      })

      test('handles errors from the addResponseToFirestore() function', () => {

      })
    })
  })

  describe('followUp()', () => {
    test.todo('testing for followUp()')
  })
})