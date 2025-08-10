const { InstancesClient } = require('@google-cloud/compute').v1;
const logging = require('./logger.js');
const engine = require('./engine.js');

const logger = logging.logger("rebot_permissions");

const compute_engine = new InstancesClient();

/**
 * @typedef {object} CustomResponse
 * @property {number} code The HTTP status code of the response.
 * @property {string} status The short status message (e.g., 'OK', 'Internal Server Error').
 * @property {string} message The detailed message to be returned.
 */

/**
 * Checks the IAM permissions for QuizBot's Google Compute Engine VM instance.
 * @param {string[]} additionalPermissions Optional list of additional permissions to check. A default set is always checked.
 * @returns {Promise<{error: Error | null, response: CustomResponse | null}>} An object containing either an error or a success response.
 */
exports.permissions_check = async (additionalPermissions = []) => {
  const defaultPermissions = ["compute.instances.start", "compute.instances.stop", "compute.instances.get"];
  const permissions = defaultPermissions.concat(additionalPermissions);
  try {
    const quizbotEngine = engine.startup();
    logger.info(`Checking IAM permissions for ${quizbotEngine.instance} in ${quizbotEngine.zone}...`);

    const [response] = await compute_engine.testIamPermissions({
      project: quizbotEngine.project,
      zone: quizbotEngine.zone,
      resource: quizbotEngine.instance,
      permissions: permissions
    })

    const grantedPermissions = response.permissions || []
    const deniedPermissions = permissions.filter(permission => !grantedPermissions.includes(permission))

    const message = `Permissions Check for ${quizbotEngine.instance}:\n` +
    `Granted Permissions: ${grantedPermissions.length > 0 ? grantedPermissions.join(', ') : 'None'}\n` +
    `Denied Permissions: ${deniedPermissions.length > 0 ? deniedPermissions.join(', ') : 'None'}`;

    logger.info(message);

    if(defaultPermissions.some(permission => !grantedPermissions.includes(permission))){
      return {error: Error(`A required default permission was denied - please check the logs for details.`), response: null}
    } else {
      return { error: null, response: { code: 200, status: 'OK', message: `Permissions check complete. Granted: ${grantedPermissions.length}, Denied: ${deniedPermissions.length}` } };
    }
  } catch(error) {
    logger.error(`Fatal Error when trying to test IAM permissions on QuizBot\nERROR:\n${error.message}`);
    return {error, response: null}
  }
}