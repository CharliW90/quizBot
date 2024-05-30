const assignRole = require("./assignRole");
const createCategoryChannel = require("./createCategoryChannel");
const createRole = require("./createRole");
const createTextChannel = require("./createTextChannel");
const createVoiceChannel = require("./createVoiceChannel");
const deleteRole = require("./deleteRole");
const deleteTextChannel = require("./deleteTextChannel");
const deleteVoiceChannel = require("./deleteVoiceChannel");
const findAdmins = require("./findAdmins");
const findCategoryChannel = require("./findCategoryChannel");
const findTextChannel = require("./findTextChannel");
const findVoiceChannel = require("./findVoiceChannel");


module.exports = {
  assignRole,
  createCategoryChannel,
  createRole,
  createTextChannel,
  createVoiceChannel,
  deleteRole,
  deleteTextChannel,
  deleteVoiceChannel,
  findAdmins,
  findCategoryChannel,
  findTextChannel,
  findVoiceChannel
}