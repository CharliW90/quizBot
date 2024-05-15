const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const data = require('../__data__');
const {holdSpy, heldResponsesSpy, parseSpy} = require('../__mocks__/spies'); // note: spies must be called before declaring the function they will be called by

const fetchFormResponses = require('../functions/forms/fetchFormResponses');

jest.mock('axios')

const mockData = data.apiResponses;

describe('fetchFormResponses.js', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });
  afterEach(() => {
    jest.restoreAllMocks();
  })

  test('returns an empty array when API returns no data', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    const response = await fetchFormResponses(1);
    expect(response).toEqual([]);
    expect(parseSpy).not.toHaveBeenCalled();
    expect(heldResponsesSpy).not.toHaveBeenCalled();
  });

  test('parses and stores embeds when API returns data for a single round, returns a single embed response', async () => {
    const input = mockData[0]
    axios.get.mockResolvedValueOnce({ data: [input] });
    const [embed] = await fetchFormResponses(1);
    expect(embed).toBeInstanceOf(EmbedBuilder);
    expect(embed).toMatchObject<EmbedBuilder>(data.botRoundEmbed)
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenCalledWith(input, true);
    expect(holdSpy).toHaveBeenCalledTimes(1);
    expect(holdSpy).toHaveBeenCalledWith(input.roundDetails.number, expect.any(Object), Object.keys(input.results).sort())
    expect(heldResponsesSpy).toHaveBeenCalledTimes(1);
    expect(heldResponsesSpy).toHaveBeenCalledWith();
  });

  test('parses and stores 6 lots of embeds when API returns data for all rounds, returns a single embed response', async () => {
    const input = mockData
    axios.get.mockResolvedValueOnce({ data: input });
    const [embed] = await fetchFormResponses("all");
    expect(embed).toBeInstanceOf(EmbedBuilder);
    expect(embed).toMatchObject<EmbedBuilder>(data.botRoundEmbed);
    expect(parseSpy).toHaveBeenCalledTimes(6);
    expect(parseSpy).toHaveBeenNthCalledWith(1, input[0], true);
    expect(parseSpy).toHaveBeenNthCalledWith(2, input[1], true);
    expect(parseSpy).toHaveBeenNthCalledWith(3, input[2], true);
    expect(parseSpy).toHaveBeenNthCalledWith(4, input[3], true);
    expect(parseSpy).toHaveBeenNthCalledWith(5, input[4], true);
    expect(parseSpy).toHaveBeenNthCalledWith(6, input[5], true);
    expect(holdSpy).toHaveBeenCalledTimes(6);
    expect(holdSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Object), expect.any(Array))
    expect(holdSpy).toHaveBeenNthCalledWith(1, input[0].roundDetails.number, expect.any(Array), Object.keys(input[0].results).sort());
    expect(holdSpy).toHaveBeenNthCalledWith(2, input[1].roundDetails.number, expect.any(Array), Object.keys(input[1].results).sort());
    expect(holdSpy).toHaveBeenNthCalledWith(3, input[2].roundDetails.number, expect.any(Array), Object.keys(input[2].results).sort());
    expect(holdSpy).toHaveBeenNthCalledWith(4, input[3].roundDetails.number, expect.any(Array), Object.keys(input[3].results).sort());
    expect(holdSpy).toHaveBeenNthCalledWith(5, input[4].roundDetails.number, expect.any(Array), Object.keys(input[4].results).sort());
    expect(holdSpy).toHaveBeenNthCalledWith(6, input[5].roundDetails.number, expect.any(Array), Object.keys(input[5].results).sort());
    expect(heldResponsesSpy).toHaveBeenCalledTimes(1);
    expect(heldResponsesSpy).toHaveBeenCalledWith();
  });

  test('handles errors from the API call', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('API request failed');
    axios.get.mockRejectedValueOnce(error);
    await expect(fetchFormResponses(1)).rejects.toEqual(error);
    expect(parseSpy).not.toHaveBeenCalled();
    expect(heldResponsesSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
