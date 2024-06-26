const createCategoryChannel = require("./createCategoryChannel");
const createRole = require("./createRole");
const createTextChannel = require("./createTextChannel");
const createVoiceChannel = require("./createVoiceChannel");
const deleteCategoryChannel = require("./deleteCategoryChannel")
const deleteRole = require("./deleteRole");
const deleteTextChannel = require("./deleteTextChannel");
const deleteVoiceChannel = require("./deleteVoiceChannel");
const findAdmins = require("./findAdmins");
const findCategoryChannel = require("./findCategoryChannel");
const findChildrenOfCategory = require("./findChildrenOfCategory");
const findRole = require("./findRole");
const findTextChannel = require("./findTextChannel");
const findVoiceChannel = require("./findVoiceChannel");
const roleAssign = require("./roleAssign");
const roleRemove = require("./roleRemove");

module.exports = {
  createCategoryChannel,
  createRole,
  createTextChannel,
  createVoiceChannel,
  deleteCategoryChannel,
  deleteRole,
  deleteTextChannel,
  deleteVoiceChannel,
  findAdmins,
  findCategoryChannel,
  findChildrenOfCategory,
  findRole,
  findTextChannel,
  findVoiceChannel,
  roleAssign,
  roleRemove
}