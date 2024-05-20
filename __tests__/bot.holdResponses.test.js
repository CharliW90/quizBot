const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const data = require('../__data__');
const {holdSpy, heldResponsesSpy, parseSpy} = require('../__mocks__/spies'); // note: spies must be called before declaring the function they will be called by

describe('holdFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  describe('hold()', () => {
    describe('returns errors when passed incorrect data', () => {
      const { hold } = require('../functions/forms/holdFormResponses')

      const roundNum = 3;
      const teamNames = ["teamName", "another", "a_third"];
      const embeds = [data.botRoundEmbed]
      
      test('returns an error when passed no data', () => {
        const [err, response] = hold();
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`round number was undefined; embeds were undefined; team names were undefined`)
        expect(response).toBeNull();
      })

      test('returns an error when not passed arrays for embeds or teamNames', () => {
        const dataObject = {teamName: "data"};
        let [err, response] = hold(roundNum, dataObject, teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`embeds must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(response).toBeNull();

        [err, response] = hold(roundNum, embeds, dataObject);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`team names must be provided as an array; received ${JSON.stringify(dataObject)}`);
        expect(response).toBeNull();
      })

      test('returns an error when passed empty arrays for teams or embeds', () => {
        let [err, response] = hold(roundNum, [], teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`embeds must be provided as an array; received []`)
        expect(response).toBeNull();

        [err, response] = hold(roundNum, embeds, []);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`team names must be provided as an array; received []`);
        expect(response).toBeNull();
      })

      test('returns an error if number of teams does not match number of embeds', () => {
        const [err, response] = hold(roundNum, embeds, teamNames);
        expect(err.code).toEqual(400);
        expect(err.message).toEqual(`mismatch between team names and embeds received`);
        expect(err.details).toMatchObject({embeds, teamNames})
        expect(response).toBeNull();
      })
    })
  })

  
})