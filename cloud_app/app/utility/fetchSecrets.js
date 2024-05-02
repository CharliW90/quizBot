const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

module.exports = async (secretName) => {
  const client = new SecretManagerServiceClient();

  const request = {
    name: `projects/${process.env.projectId}/secrets/${secretName}/versions/latest`,
  };

  const [response] = await client.accessSecretVersion(request);

  return response.payload.data.toString();
}


