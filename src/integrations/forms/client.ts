import { google, forms_v1 } from "googleapis";
import { logger } from "../../utils/logger.js";

export function createFormsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/forms.body.readonly",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ],
  });

  const formsApi = google.forms({ version: "v1", auth });

  const getForm = async (formId: string): Promise<forms_v1.Schema$Form> => {
    logger.info({ formId }, "Fetching form metadata");
    const response = await formsApi.forms.get({ formId });
    return response.data;
  };

  const listResponses = async (formId: string): Promise<forms_v1.Schema$FormResponse[]> => {
    logger.info({ formId }, "Fetching form responses");
    const response = await formsApi.forms.responses.list({ formId });
    return response.data.responses ?? [];
  };

  return { getForm, listResponses };
}
