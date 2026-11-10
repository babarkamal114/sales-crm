export type CreateContactPrefill = {
  companyId?: string;
  companyName?: string;
  email?: string;
  phone?: string;
};

export type CreateCompanyPrefill = {
  name?: string;
  website?: string;
};

export type CreateOpportunityPrefill = {
  contactId?: string;
  companyId?: string;
  pipelineId?: string;
  stageId?: string;
  source?: string;
  campaign?: string;
};
