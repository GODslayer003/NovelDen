import SibApiV3Sdk from 'sib-api-v3-sdk';

const createCampaign = async ({
  name,
  subject,
  senderName,
  senderEmail,
  htmlContent,
  listIds,
  scheduledAt, // optional: string 'YYYY-MM-DD HH:mm:ss' or ISO
  type = 'classic',
  retries = 2,
}) => {
  if (!process.env.BREVO_API_KEY && !process.env.SENDINBLUE_API_KEY) {
    throw new Error('BREVO_API_KEY (or SENDINBLUE_API_KEY) is not configured');
  }
  if (!name || !subject || !senderEmail || !Array.isArray(listIds) || listIds.length === 0) {
    throw new Error('Missing required fields: name, subject, senderEmail, listIds');
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;

  const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();
  const campaign = new SibApiV3Sdk.CreateEmailCampaign();

  campaign.name = name;
  campaign.subject = subject;
  campaign.sender = { name: senderName || 'Novel Den', email: senderEmail };
  campaign.type = type;
  campaign.htmlContent = htmlContent || '<p></p>';
  campaign.recipients = { listIds };
  if (scheduledAt) campaign.scheduledAt = scheduledAt;

  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const data = await apiInstance.createEmailCampaign(campaign);
      return data;
    } catch (err) {
      if (attempt > retries) {
        const message = err && err.response && err.response.text ? err.response.text : err.message || String(err);
        throw new Error(`Brevo createEmailCampaign failed after ${attempt} attempts: ${message}`);
      }
      const delay = 500 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

export default createCampaign;
