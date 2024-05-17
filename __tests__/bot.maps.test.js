const { mockTextChannel, mockManyChannels } = require("../__mocks__/textChannels");

const teamName = 'team-name';
const id = '1234-5678-90';

const textChannel = mockTextChannel(teamName, id);
const channels = mockManyChannels(6);
const unstoredTextChannel = mockTextChannel('unregisteredTeamName', '123-456-123-987');
const copyOfChannel = JSON.stringify(textChannel);

describe('teamChannels.js - error first functions', () => {
  describe('registerTeamChannel()', () => {
    beforeEach(() => {
      const {registerTeamChannel, channelFromTeam} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no team name or channel given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const registration = registerTeamChannel();
      expect(registration).toHaveLength(2);
      const [err, respoonse] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Team Name was undefined, Channel was undefined`);
      expect(respoonse).toBeNull();
    })

    test('returns error message and null response if no team name given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const registration = registerTeamChannel(undefined, textChannel);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Team Name was undefined, Channel was ${textChannel}`);
      expect(response).toBeNull();
    })

    test('returns error message and null response if no channel given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const registration = registerTeamChannel(teamName);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Team Name was ${teamName}, Channel was undefined`);
      expect(response).toBeNull();
    })

    test('returns response with details of linked team name and channel id', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const registration = registerTeamChannel(teamName, textChannel);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err).toBeNull();
      expect(response).toEqual(`${teamName}::${textChannel.id}`)
    })

    test('returns error message with details of linked team name and channel id if link already exists', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const [initialErr, initialResponse] = registerTeamChannel(teamName, textChannel);
      expect(initialErr).toBeNull();
      expect(initialResponse).toEqual(`${teamName}::${textChannel.id}`);
      const secondRegistration = registerTeamChannel(teamName, textChannel);
      expect(secondRegistration).toHaveLength(2);
      const [err, response] = secondRegistration;
      expect(err.code).toBe(409);
      expect(err.message).toEqual(`${teamName} already linked to ${textChannel.id}`);
      expect(response).toBeNull();
    })
  })

  describe('setAlias()', () => {
    beforeEach(() => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
      registerTeamChannel(teamName, textChannel)
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no alias or team name given', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const registration = setAlias();
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Alias was undefined, Team Name was undefined`)
      expect(response).toBeNull()
    })

    test('returns error message and null response if no team name given', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const registration = setAlias(alias);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Alias was ${alias}, Team Name was undefined`)
      expect(response).toBeNull()
    })

    test('returns error message and null response if no alias given', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const team = 'invalid-team-name'
      const registration = setAlias(undefined, teamName);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(400);
      expect(err.message).toEqual(`Alias was undefined, Team Name was ${teamName}`);
      expect(response).toBeNull()
    })

    test('returns error message and null response if team name is not valid', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const team = 'invalid-team-name'
      const registration = setAlias(alias, team);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err.code).toBe(404);
      expect(err.message).toEqual(`No team registered as ${team}`);
      expect(response).toBeNull()
    })

    test('returns response with details of linked alias, team name and channel ID', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const registration = setAlias(alias, teamName);
      expect(registration).toHaveLength(2);
      const [err, response] = registration;
      expect(err).toBeNull();
      expect(response).toEqual(`${alias}::${teamName}::${textChannel.id}`);
    })

    test('returns error message and null response if alias already linked to a team name', () => {
      //aliases are a many-to-one relationship type - an alias must not link to more than one team name
      const {setAlias, registerTeamChannel, channelFromTeam} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const [initialErr, initialResponse] = setAlias(alias, teamName);
      expect(initialErr).toBeNull();

      const anotherTeamName = 'registered-team'
      const anotherTextChannel = mockTextChannel(anotherTeamName, '101-400-456');
      registerTeamChannel(anotherTeamName, anotherTextChannel);

      const subsequentAlias = setAlias(alias, anotherTeamName)
      expect(subsequentAlias).toHaveLength(2);
      const [err, response] = subsequentAlias;
      expect(err.code).toBe(405);
      expect(err.message).toEqual(`${alias} already links to a team name`);
      expect(response).toBeNull();

      const aliasStillWorks = channelFromTeam(alias);
      const [aliasErr, aliasResponse] = aliasStillWorks;
      expect(aliasErr).toBeNull();
      expect(aliasResponse).toEqual(textChannel);
    })

    test('returns response if alias already linked to a team name but overwrite is used', () => {
      //aliases are a many-to-one relationship type - an alias must not link to more than one team name
      const {setAlias, registerTeamChannel, channelFromTeam} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const [initialErr, initialResponse] = setAlias(alias, teamName);
      expect(initialErr).toBeNull();

      const anotherTeamName = 'registered-team'
      const anotherTextChannel = mockTextChannel(anotherTeamName, '101-400-456');
      registerTeamChannel(anotherTeamName, anotherTextChannel);

      const subsequentAlias = setAlias(alias, anotherTeamName, true)
      expect(subsequentAlias).toHaveLength(2);
      const [err, response] = subsequentAlias;
      expect(err).toBeNull();
      expect(response).toEqual(`${alias}::${anotherTeamName}::${anotherTextChannel.id}`);

      const aliasLinksDifferently = channelFromTeam(alias);
      const [aliasErr, aliasResponse] = aliasLinksDifferently;
      expect(aliasErr).toBeNull();
      expect(aliasResponse).not.toEqual(textChannel);
      expect(aliasResponse).toBe(anotherTextChannel);
    })
  })
  
  describe('channelFromTeam()', () => {
    beforeEach(() => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
      registerTeamChannel(teamName, textChannel);
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no team name given', () => {
      const {channelFromTeam} = require("../functions/maps/teamChannels");

      const channel = channelFromTeam();
      expect(channel).toHaveLength(2);
      const [channelErr, channelResponse] = channel;
      expect(channelErr.code).toBe(400);
      expect(channelErr.message).toEqual(`Team Name was undefined`);
      expect(channelResponse).toBeNull();
    })

    test('returns response with the matching channel', () => {
      const {channelFromTeam} = require("../functions/maps/teamChannels");
      
      const channel = channelFromTeam(teamName);
      expect(channel).toHaveLength(2);
      const [channelErr, channelResponse] = channel;
      expect(channelErr).toBeNull();
      expect(channelResponse).toEqual(textChannel);
    })
    
    test('returns error message and null response if team is not in store', () => {
      const {channelFromTeam} = require("../functions/maps/teamChannels");
      
      const invalidName = 'not-a-stored-team'
      
      const channel = channelFromTeam(invalidName);
      expect(channel).toHaveLength(2);
      const [channelErr, channelResponse] = channel;
      expect(channelErr.code).toBe(404);
      expect(channelErr.message).toEqual(`${invalidName} not found`)
      expect(channelResponse).toBeNull();
    })
    
    test('can use aliases to find channels, returns same channel object', () => {
      const {channelFromTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      
      // channelFromTeam(alias) returns error message and null response if alias has not been set
      const initialLookupViaAlias = channelFromTeam(alias);
      expect(initialLookupViaAlias).toHaveLength(2);
      const [initialErr, initialResponse] = initialLookupViaAlias;
      expect(initialErr.code).toBe(404);
      expect(initialErr.message).toEqual(`${alias} not found`);
      expect(initialResponse).toBeNull();
      
      setAlias(alias, teamName);
      
      // channelFromTeam(alias) returns response with the matching channel
      const channelLookupViaAlias = channelFromTeam(alias);
      expect(channelLookupViaAlias).toHaveLength(2);
      const [aliasErr, aliasResponse] = channelLookupViaAlias;
      expect(aliasErr).toBeNull();
      expect(aliasResponse).toEqual(textChannel);
      
      // channelFromTeam(name) also returns response with the matching channel
      const channelLookupViaName = channelFromTeam(teamName);
      expect(channelLookupViaName).toHaveLength(2);
      const [nameErr, nameResponse] = channelLookupViaName;
      expect(nameErr).toBeNull();
      expect(nameResponse).toEqual(textChannel);
      
      // the returned channels are the same Object in memory
      expect(aliasResponse).toBe(nameResponse);
      
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  })

  describe('teamFromChannel()', () => {
    beforeEach(() => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
      registerTeamChannel(teamName, textChannel);
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no channel given', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const team = teamFromChannel();
      expect(team).toHaveLength(2);
      const [teamErr, teamResponse] = team;
      expect(teamErr.code).toBe(400);
      expect(teamErr.message).toEqual(`Channel was undefined`);
      expect(teamResponse).toBeNull();
    })

    test('returns error message and null response if channel given has no ID property', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const team = teamFromChannel({name: 'fake channel'});
      expect(team).toHaveLength(2);
      const [teamErr, teamResponse] = team;
      expect(teamErr.code).toBe(400);
      expect(teamErr.message).toEqual(`Channel ID was undefined`);
      expect(teamResponse).toBeNull();
    })

    test('returns response with the matching team name', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const team = teamFromChannel(textChannel);
      expect(team).toHaveLength(2);
      const [teamErr, teamResponse] = team;
      expect(teamErr).toBeNull();
      expect(teamResponse).toEqual(teamName);
    })
  
    test('returns error message and null response if channel is not in store', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const team = teamFromChannel(unstoredTextChannel);
      expect(team).toHaveLength(2);
      const [teamErr, teamResponse] = team;
      expect(teamErr.code).toBe(404);
      expect(teamErr.message).toEqual(`Channel ${unstoredTextChannel.id} not found`);
      expect(teamResponse).toBeNull();
    })
  })
  
  describe('deleteTeam()', () => {
    beforeEach(() => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
      registerTeamChannel(teamName, textChannel);
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no team given', () => {
      const {deleteTeam} = require("../functions/maps/teamChannels");

      const deletedTeam = deleteTeam();
      expect(deletedTeam).toHaveLength(2);
      const [deleteErr, deleteResponse] = deletedTeam;
      expect(deleteErr.code).toBe(400);
      expect(deleteErr.message).toEqual(`Team Name was undefined`);
      expect(deleteResponse).toBeNull();
    })

    test('removes a stored team from the store', () => {
      const {channelFromTeam, deleteTeam} = require("../functions/maps/teamChannels");
      
      // lookup team shows that it exists in store
      const channel = channelFromTeam(teamName);
      expect(channel).toHaveLength(2);
      const [channelErr, channelResponse] = channel;
      expect(channelErr).toBeNull();
      expect(channelResponse).toEqual(textChannel);
  
      // deletion results in no error, and a response with the team name
      const deletedTeam = deleteTeam(teamName);
      expect(deletedTeam).toHaveLength(2);
      const [deleteErr, deleteResponse] = deletedTeam;
      expect(deleteErr).toBeNull();
      expect(deleteResponse).toEqual(teamName);
  
      // retrying lookup team shows that it no longer exists in store
      const retry = channelFromTeam(teamName);
      expect(retry).toHaveLength(2);
      const [retryErr, retryResponse] = retry;
      expect(retryErr.code).toBe(404);
      expect(retryErr.message).toEqual(`${teamName} not found`);
      expect(retryResponse).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  
    test('returns returns error message and null response if team does not exist', () => {
      const {channelFromTeam, deleteTeam} = require("../functions/maps/teamChannels");

      const invalidName = 'not-a-team';

      // incorrect team name not found in store
      const channel = channelFromTeam(invalidName);
      const [channelErr, channelResponse] = channel;
      expect(channelErr.code).toBe(404);
      expect(channelErr.message).toEqual(`${invalidName} not found`);
      expect(channelResponse).toBeNull();
  
      // deletion of incorrect team name returns error message and null response
      const deletedTeam = deleteTeam(invalidName);
      expect(deletedTeam).toHaveLength(2);
      const [deleteErr, deleteResponse] = deletedTeam;
      expect(deleteErr.code).toBe(404);
      expect(deleteErr.message).toEqual(`${invalidName} not found`);
      expect(deleteResponse).toBeNull();
  
      // incorrect team name still not found in store
      const retry = channelFromTeam(invalidName);
      expect(retry).toHaveLength(2);
      const [retryErr, retryResponse] = retry;
      expect(retryErr.code).toBe(404);
      expect(retryErr.message).toEqual(`${invalidName} not found`);
      expect(retryResponse).toBeNull();
  
      // store still holds real team name(s)
      const realTeamLookup = channelFromTeam(teamName);
      expect(realTeamLookup).toHaveLength(2);
      const [lookupErr, lookupResponse] = realTeamLookup;
      expect(lookupErr).toBeNull();
      expect(lookupResponse).toEqual(textChannel);
    })

    test('can use aliases to delete channels', () => {
      const {channelFromTeam, deleteTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      setAlias(alias, teamName);
  
      // registered name and alias are both available from store
      const [initialNameErr, initialNameResponse] = channelFromTeam(teamName)
      expect(initialNameErr).toBeNull();
      const [initialAliasErr, initialAliasResponse] = channelFromTeam(alias)
      expect(initialAliasErr).toBeNull();
      expect(initialAliasResponse).toBe(initialNameResponse);
  
      // deletion is successful
      const deletion = deleteTeam(alias);
      expect(deletion).toHaveLength(2);
      const [deletionErr, deletionResponse] = deletion;
      expect(deletionErr).toBeNull();
      expect(deletionResponse).toBeDefined();
  
      // the alias should no longer return a result, and lookup will be undefined
      const channelLookupViaAlias = channelFromTeam(alias);
      expect(channelLookupViaAlias).toHaveLength(2);
      const [aliasErr, aliasResponse] = channelLookupViaAlias;
      expect(aliasErr.code).toBe(404);
      expect(aliasErr.message).toEqual(`${alias} not found`);
      expect(aliasResponse).toBeNull();
  
      // the correct name should no longer return a result, and lookup will be undefined
      const channelLookupViaName = channelFromTeam(teamName);
      expect(channelLookupViaName).toHaveLength(2);
      const [nameErr, nameResponse] = channelLookupViaName;
      expect(nameErr.code).toBe(404);
      expect(nameErr.message).toEqual(`${teamName} not found`);
      expect(nameResponse).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  
    test('also deletes any aliases that match that channels team name', () => {
      const {channelFromTeam, deleteTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      setAlias(alias, teamName);
  
      // deleteTeam(alias) should succeed, and return both the correct team name and the alias as a success message
      const deleteChannelViaAlias = deleteTeam(alias);
      expect(deleteChannelViaAlias).toHaveLength(2);
      const [deleteErr, deleteResponse] = deleteChannelViaAlias;
      expect(deleteErr).toBeNull();
      expect(deleteResponse).toEqual(`${teamName}, ${alias}`);
  
      // the alias should no longer return a result, and lookup will be undefined
      const channelLookupViaAlias = channelFromTeam(alias);
      expect(channelLookupViaAlias).toHaveLength(2);
      const [aliasErr, aliasResponse] = channelLookupViaAlias;
      expect(aliasErr.code).toBe(404);
      expect(aliasErr.message).toEqual(`${alias} not found`);
      expect(aliasResponse).toBeNull();
  
      // the correct name should no longer return a result, and lookup will be undefined
      const channelLookupViaName = channelFromTeam(teamName);
      expect(channelLookupViaName).toHaveLength(2);
      const [nameErr, nameResponse] = channelLookupViaName;
      expect(nameErr.code).toBe(404);
      expect(nameErr.message).toEqual(`${teamName} not found`);
      expect(nameResponse).toBeNull();
  
      // what would have been a valid delete request should now fail
      const subsequentDeleteTeam = deleteTeam(teamName);
      expect(subsequentDeleteTeam).toHaveLength(2);
      const [subsequentDeleteErr, subsequentDeleteResponse] = subsequentDeleteTeam;
      expect(subsequentDeleteErr.code).toBe(404);
      expect(subsequentDeleteErr.message).toEqual(`${teamName} not found`);
      expect(subsequentDeleteResponse).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  })
})