export interface MetaWebhookEntry {
  id: string; // WABA ID
  changes: Array<{
    field: string; // 'messages', 'message_template_status_update', etc.
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string; // wamid
        timestamp: string;
        type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'interactive' | 'button';
        text?: {
          body: string;
        };
        image?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        audio?: {
          id: string;
          mime_type: string;
        };
        video?: {
          id: string;
          mime_type: string;
        };
        document?: {
          id: string;
          mime_type: string;
          filename?: string;
        };
        location?: {
          latitude: number;
          longitude: number;
          name?: string;
          address?: string;
        };
        interactive?: any;
      }>;
      statuses?: Array<{
        id: string; // wamid
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message?: string;
          error_data?: {
            details: string;
          };
        }>;
      }>;
    };
  }>;
}

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}
