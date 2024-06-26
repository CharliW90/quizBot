const axios = require('axios');
const data = require('../__data__');
const {holdSpy, parseSpy} = require('../__mocks__/functionSpies'); // note: spies must be called before declaring the function they will be called by

jest.mock('axios')

const mockData = data.apiResponses;

describe('fetch()', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  test('returns an error when API returns no data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const {fetch} = require('../functions/forms/fetchFormResponses');

    axios.get.mockResolvedValueOnce({ data: [] });
    const {error, response} = await fetch(1);
    expect(error.code).toEqual(404);
    expect(error.message).toEqual("forms API response was []");
    expect(error.loc).toBeDefined();
    expect(response).toBeNull();

    expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    expect(parseSpy).not.toHaveBeenCalled();
    expect(holdSpy).not.toHaveBeenCalled();
  });

  test('returns an error when API returns a Promise rejection', async () => {
    const {fetch} = require('../functions/forms/fetchFormResponses');

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorMsg = new Error('API request failed');
    axios.get.mockRejectedValueOnce(errorMsg);

    const {error, response} = await fetch(1);
    expect(error).toEqual(errorMsg);
    expect(response).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);

    expect(parseSpy).not.toHaveBeenCalled();
    expect(holdSpy).not.toHaveBeenCalled();
  });

  test('parses embeds when API returns data for a single round, returns summary details', async () => {
    const {fetch} = require('../functions/forms/fetchFormResponses');

    const input = mockData[0]
    axios.get.mockResolvedValueOnce({ data: [input] });

    const {error, response} = await fetch(1);
    expect(error).toBeNull();
    expect(response).toBeInstanceOf(Array);
    expect(response).toEqual([{roundNum: input.roundDetails.number, teams: Object.keys(input.results).map(teamname => teamname.toLowerCase())}]);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenCalledWith(input);

    expect(holdSpy).toHaveBeenCalledTimes(1);
    expect(holdSpy).toHaveBeenCalledWith(input.roundDetails.number, expect.any(Object), Object.keys(input.results))
  
  });

  test('parses 6 lots of embeds when API returns data for all rounds, returns summary details', async () => {
    const {fetch} = require('../functions/forms/fetchFormResponses');
    
    const input = mockData
    const rounds = mockData.length
    axios.get.mockResolvedValueOnce({ data: [...input] });

    const {error, response} = await fetch("all");
    expect(error).toBeNull()
    expect(response).toBeInstanceOf(Array);
    expect(response).toEqual(input.map((round) => {return {roundNum: round.roundDetails.number, teams: Object.keys(round.results).map(teamname => teamname.toLowerCase())}}));

    expect(parseSpy).toHaveBeenCalledTimes(rounds);
    for(let i = 0; i < rounds; i++){
      expect(parseSpy).toHaveBeenNthCalledWith(i+1, input[i]);
    }

    expect(holdSpy).toHaveBeenCalledTimes(rounds);
    for(let i = 0; i < rounds; i++){
      expect(holdSpy).toHaveBeenNthCalledWith(i+1, input[i].roundDetails.number, expect.any(Array), Object.keys(input[i].results));
    }
  });

  describe('handles errors from dependencies', () => {
    beforeEach(() => {
      jest.resetModules();
    });
    afterEach(() => {
      jest.clearAllMocks();
      jest.unmock('../functions/forms/parseFormResponses');
      jest.unmock('../functions/forms/holdFormResponses');
    });

    test('handles errors from the parse() function', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const axios = require('axios');

      const mockErrorMsg = {message: "this would not be a useful error message", code: 400, loc: "parse()"}
      jest.mock('../functions/forms/parseFormResponses')
      const {parse} = require('../functions/forms/parseFormResponses');
      parse.mockReturnValue({error: mockErrorMsg, response: null});

      const {fetch} = require('../functions/forms/fetchFormResponses');
      
      const input = mockData[0]
      axios.get.mockResolvedValueOnce({ data: [input] });
      const output = await fetch(1);
      const {error, response} = output;
      expect(response).toBeNull();
      expect(error.code).toEqual(mockErrorMsg.code);
      expect(error.message).toEqual(mockErrorMsg.message);
      expect(error.loc).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockErrorMsg);
    })

    test('handles errors from the hold() function', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const axios = require('axios');

      const mockErrorMsg = {message: "this might one day be a useful error message", code: 400, loc: "hold()"}
      jest.mock('../functions/forms/holdFormResponses', () => {
        const originalFunctions = jest.requireActual('../functions/forms/holdFormResponses');

        return {
          __esModule: true,
          ...originalFunctions,
          hold: jest.fn(() => {return {error: mockErrorMsg, response: null}})
        }
      });

      const {fetch} = require('../functions/forms/fetchFormResponses');

      const input = mockData[0];
      axios.get.mockResolvedValueOnce({ data: [input] });
      const output = await fetch(1);
      const {error, response} = output;

      expect(response).toBeNull();
      expect(error.code).toEqual(mockErrorMsg.code);
      expect(error.message).toEqual(mockErrorMsg.message);
      expect(error.loc).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockErrorMsg);
    })
  })
});

describe('summarise()', () => {
  test.todo('testing for summarise() function')
})
