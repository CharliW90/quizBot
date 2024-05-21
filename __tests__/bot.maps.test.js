const { mockTextChannel, mockManyChannels } = require("../__mocks__/textChannels");

const teamName = 'team-name';
const id = '1234-5678-90';

const textChannel = mockTextChannel(teamName, id);
const channels = mockManyChannels(6);
const unstoredTextChannel = mockTextChannel('unregisteredTeamName', '123-456-123-987');
const copyOfChannel = JSON.stringify(textChannel);

describe('teamChannels.js', () => {
  describe('registerTeamChannel()', () => {
    beforeEach(() => {
      const {registerTeamChannel, setAlias} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns error message and null response if no team name or channel given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const {error, response} = registerTeamChannel();
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Team Name was undefined, Channel was undefined`);
      expect(response).toBeNull();
    })

    test('returns error message and null response if no team name given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const {error, response} = registerTeamChannel(undefined, textChannel);
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Team Name was undefined, Channel was ${textChannel}`);
      expect(response).toBeNull();
    })

    test('returns error message and null response if no channel given', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const {error, response} = registerTeamChannel(teamName);
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Team Name was ${teamName}, Channel was undefined`);
      expect(response).toBeNull();
    })

    test('returns response with details of linked team name and channel id', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      const {error, response} = registerTeamChannel(teamName, textChannel);
      expect(error).toBeNull();
      expect(response).toEqual(`${teamName}::${textChannel.id}`)
    })

    test('returns error message with details of linked team name and channel id if link already exists', () => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");

      let {error, response} = registerTeamChannel(teamName, textChannel);
      expect(error).toBeNull();
      expect(response).toEqual(`${teamName}::${textChannel.id}`);
      ({error, response} = registerTeamChannel(teamName, textChannel));
      expect(error.code).toBe(409);
      expect(error.message).toEqual(`${teamName} already linked to a channel`);
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

      const {error, response} = setAlias();
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Alias was undefined, Team Name was undefined`)
      expect(response).toBeNull();
    })

    test('returns error message and null response if no team name given', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const {error, response} = setAlias(alias);
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Alias was ${alias}, Team Name was undefined`)
      expect(response).toBeNull();
    })

    test('returns error message and null response if no alias given', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const team = 'invalid-team-name'
      const {error, response} = setAlias(undefined, teamName);
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Alias was undefined, Team Name was ${teamName}`);
      expect(response).toBeNull();
    })

    test('returns error message and null response if team name is not valid', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const team = 'invalid-team-name'
      const {error, response} = setAlias(alias, team);
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`No team registered as ${team}`);
      expect(response).toBeNull()
    })

    test('returns response with details of linked alias, team name and channel ID', () => {
      const {setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias'
      const {error, response} = setAlias(alias, teamName);
      expect(error).toBeNull();
      expect(response).toEqual(`${alias}::${teamName}::${textChannel.id}`);
    })

    test('returns error message and null response if alias already linked to a team name', () => {
      //aliases are a many-to-one relationship type - an alias must not link to more than one team name
      const {setAlias, registerTeamChannel, channelFromTeam} = require("../functions/maps/teamChannels");
      
      const anotherTeamName = 'registered-team'
      const anotherTextChannel = mockTextChannel(anotherTeamName, '101-400-456');
      registerTeamChannel(anotherTeamName, anotherTextChannel);

      // setting an alias for a channel works
      const alias = 'this-alias'
      let {error, response} = setAlias(alias, teamName);
      expect(error).toBeNull();

      // the linked alias works
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);

      // trying to set that alias as linking to another channel does not work
      ({error, response} = setAlias(alias, anotherTeamName));
      expect(error.code).toBe(405);
      expect(error.message).toEqual(`${alias} already links to a team name`);
      expect(response).toBeNull();

      // the original link of alias still works
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);
    })

    test('returns response if alias already linked to a team name but overwrite is used', () => {
      //aliases are a many-to-one relationship type - an alias must not link to more than one team name
      const {setAlias, registerTeamChannel, channelFromTeam} = require("../functions/maps/teamChannels");

      const anotherTeamName = 'registered-team'
      const anotherTextChannel = mockTextChannel(anotherTeamName, '101-400-456');
      registerTeamChannel(anotherTeamName, anotherTextChannel);

      // setting an alias for a channel works
      const alias = 'this-alias'
      let {error, response} = setAlias(alias, teamName);
      expect(error).toBeNull();

      // the linked alias works
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);

      // setting that alias as linking to another channel works when 'true' is passed as the overwrite value
      ({error, response} = setAlias(alias, anotherTeamName, true));
      expect(error).toBeNull();
      expect(response).toEqual(`${alias}::${anotherTeamName}::${anotherTextChannel.id}`);

      // that alias now links to the second channel, not the first
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(anotherTextChannel);
      expect(response).not.toBe(textChannel);
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

      const {error, response} = channelFromTeam();
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Team Name was undefined`);
      expect(response).toBeNull();
    })

    test('returns response with the matching channel', () => {
      const {channelFromTeam} = require("../functions/maps/teamChannels");
      
      const {error, response} = channelFromTeam(teamName);
      expect(error).toBeNull();
      expect(response).toEqual(textChannel);
    })
    
    test('returns error message and null response if team is not in store', () => {
      const {channelFromTeam} = require("../functions/maps/teamChannels");
      
      const invalidName = 'not-a-stored-team'
      
      const {error, response} = channelFromTeam(invalidName);
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${invalidName} not found`)
      expect(response).toBeNull();
    })
    
    test('can use aliases to find channels, returns same channel object', () => {
      const {channelFromTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      
      // channelFromTeam(alias) returns error message and null response if alias has not been set
      let {error, response} = channelFromTeam(alias);
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${alias} not found`);
      expect(response).toBeNull();
      
      setAlias(alias, teamName);
      
      // channelFromTeam(alias) returns response with the matching channel
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);
      
      // channelFromTeam(name) also returns response with the matching channel
      ({error, response} = channelFromTeam(teamName));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);
      
      // the returned channels are the same Object in memory
      expect(channelFromTeam(alias).response).toBe(channelFromTeam(teamName).response);
      
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

      const {error, response} = teamFromChannel();
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Channel was undefined`);
      expect(response).toBeNull();
    })

    test('returns error message and null response if channel given has no ID property', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const {error, response} = teamFromChannel({name: 'fake channel'});
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Channel ID was undefined`);
      expect(response).toBeNull();
    })

    test('returns response with the matching team name', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const {error, response} = teamFromChannel(textChannel);
      expect(error).toBeNull();
      expect(response).toEqual(teamName);
    })
  
    test('returns error message and null response if channel is not in store', () => {
      const {teamFromChannel} = require("../functions/maps/teamChannels");

      const {error, response} = teamFromChannel(unstoredTextChannel);
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`Channel ${unstoredTextChannel.id} not found`);
      expect(response).toBeNull();
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

      const {error, response} = deleteTeam();
      expect(error.code).toBe(400);
      expect(error.message).toEqual(`Team Name was undefined`);
      expect(response).toBeNull();
    })

    test('removes a stored team from the store', () => {
      const {channelFromTeam, deleteTeam} = require("../functions/maps/teamChannels");
      
      // lookup team shows that it exists in store
      let {error, response} = channelFromTeam(teamName);
      expect(error).toBeNull();
      expect(response).toEqual(textChannel);
  
      // deletion results in no error, and a response with the team name
      ({error, response} = deleteTeam(teamName));
      expect(error).toBeNull();
      expect(response).toEqual(teamName);
  
      // retrying lookup team shows that it no longer exists in store
      ({error, response} = channelFromTeam(teamName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${teamName} not found`);
      expect(response).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  
    test('returns returns error message and null response if team does not exist', () => {
      const {channelFromTeam, deleteTeam} = require("../functions/maps/teamChannels");

      const invalidName = 'not-a-team';

      // incorrect team name not found in store
      let {error, response} = channelFromTeam(invalidName);
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${invalidName} not found`);
      expect(response).toBeNull();
  
      // deletion of incorrect team name returns error message and null response
      ({error, response} = deleteTeam(invalidName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${invalidName} not found`);
      expect(response).toBeNull();
  
      // incorrect team name still not found in store
      ({error, response} = channelFromTeam(invalidName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${invalidName} not found`);
      expect(response).toBeNull();
  
      // store still holds real team name(s)
      ({error, response} = channelFromTeam(teamName));
      expect(error).toBeNull();
      expect(response).toBe(textChannel);
    })

    test('can use aliases to delete channels', () => {
      const {channelFromTeam, deleteTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      setAlias(alias, teamName);
  
      // registered name and alias are both available from store
      let {error, response} = channelFromTeam(teamName);
      expect(error).toBeNull();
      ({error, response} = channelFromTeam(alias));
      expect(error).toBeNull();
      expect(response).toBe(channelFromTeam(teamName).response);
  
      // deletion is successful
      ({error, response} = deleteTeam(alias));
      expect(error).toBeNull();
      expect(response).toBeDefined();
  
      // the alias should no longer return a result, and lookup will be undefined
      ({error, response} = channelFromTeam(alias));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${alias} not found`);
      expect(response).toBeNull();
  
      // the correct name should no longer return a result, and lookup will be undefined
      ({error, response} = channelFromTeam(teamName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${teamName} not found`);
      expect(response).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  
    test('also deletes any aliases that match that channels team name', () => {
      const {channelFromTeam, deleteTeam, setAlias} = require("../functions/maps/teamChannels");

      const alias = 'this-alias-is-valid';
      setAlias(alias, teamName);
  
      // deleteTeam(alias) should succeed, and return both the correct team name and the alias as a success message
      let {error, response} = deleteTeam(alias);
      expect(error).toBeNull();
      expect(response).toEqual(`${teamName}, ${alias}`);
  
      // the alias should no longer return a result, and lookup will be undefined
      ({error, response} = channelFromTeam(alias));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${alias} not found`);
      expect(response).toBeNull();
  
      // the correct name should no longer return a result, and lookup will be undefined
      ({error, response} = channelFromTeam(teamName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${teamName} not found`);
      expect(response).toBeNull();
  
      // what would have been a valid delete request should now fail
      ({error, response} = deleteTeam(teamName));
      expect(error.code).toBe(404);
      expect(error.message).toEqual(`${teamName} not found`);
      expect(response).toBeNull();
  
      // channel is not affected
      expect(JSON.stringify(textChannel)).toEqual(copyOfChannel);
    })
  })

  describe('lookupAlias()', () => {
    beforeEach(() => {
      const {registerTeamChannel} = require("../functions/maps/teamChannels");
      channels.forEach((channel) => {registerTeamChannel(...channel)});
      registerTeamChannel(teamName, textChannel);
    })
  
    afterEach(() => {
      jest.resetModules();
    })

    test('returns an error if no alias provided', () => {
      const {lookupAlias} = require("../functions/maps/teamChannels");
      
      const {error, response} = lookupAlias();
      expect(error.code).toEqual(400);
      expect(error.message).toEqual(`Alias was undefined`);
      expect(response).toBeNull();
    })

    test('returns an error if alias is not stored', () => {
      const {lookupAlias} = require("../functions/maps/teamChannels");
      
      const {error, response} = lookupAlias('a-team-alias');
      expect(error.code).toEqual(404);
      expect(error.message).toEqual(`not an alias`);
      expect(response).toBeNull();
    })

    test('returns the team name if the alias is recorded', () => {
      const {lookupAlias, setAlias} = require("../functions/maps/teamChannels");
      
      let {error, response} = setAlias('a-team-alias', teamName);
      expect(error).toBeNull();

      ({error, response} = lookupAlias('a-team-alias'));
      expect(error).toBeNull();
      expect(response).toEqual(teamName);
    })
  })
})