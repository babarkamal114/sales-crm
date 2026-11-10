export type WhatsAppChannelDetail = {
  featureEnabled: boolean;
  liveEmbeddedSignup: boolean;
  connection: {
    id: string;
    mode: 'managed' | 'byo';
    status: string;
    statusReason: string | null;
  } | null;
  sender: {
    wabaId: string;
    phoneNumberId: string;
    displayName: string | null;
    displayNameStatus: string | null;
    qualityRating: string | null;
    messagingLimitTier: string | null;
  } | null;
  templates: {
    id: string;
    name: string;
    whatsappTemplateName: string | null;
    whatsappStatus: string | null;
    language: string;
    body: string;
  }[];
};
