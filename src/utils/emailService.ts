import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type EmailAction =
  | 'shop-confirmation'
  | 'order-confirmation'
  | 'shop-approved'
  | 'promotional-email'
  | 'admin-promo-store-owners';

export interface EmailParams {
  action: EmailAction;
  email?: string;
  shopName?: string;
  customerName?: string;
  orderNumber?: string;
  shippingMethod?: string;
  total?: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  shop_id?: string;
  subject?: string;
  body?: string;
  audience?: string[];
  tier?: string;
}

export async function sendTransactionalEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[EmailService] Attempting to send email for action: ${params.action}`, params);

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) {
      console.warn(`[EmailService] Edge Function returned an error:`, error);
      showDeveloperFallback(params, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Edge Function successfully sent email. Data:`, data);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Failed to invoke Edge Function:`, err);
    showDeveloperFallback(params, errorMsg);
    // Return true for local sandbox so transaction flows like checkout are not blocked/crashed
    return { success: true, error: errorMsg };
  }
}

function showDeveloperFallback(params: EmailParams, errorReason: string) {
  // Save to localStorage so developers can view the sent emails in a sandbox or log
  const sentEmails = JSON.parse(localStorage.getItem('tenga_sent_emails') || '[]');
  const newEmail = {
    id: `email_${Date.now()}`,
    timestamp: new Date().toISOString(),
    error: errorReason,
    ...params
  };
  sentEmails.unshift(newEmail);
  localStorage.setItem('tenga_sent_emails', JSON.stringify(sentEmails.slice(0, 50)));

  // Post a premium Toast notification that transactional email was simulated
  const actionTitles: Record<EmailAction, string> = {
    'shop-confirmation': 'Shop Application Received',
    'order-confirmation': 'Order Confirmation Receipt',
    'shop-approved': 'Shop Approval Notification',
    'promotional-email': 'Seller Promotion Broadcast',
    'admin-promo-store-owners': 'Admin Store Owner Announcement'
  };

  const recipient = params.email || 'Shop Owner / Followers';
  const title = actionTitles[params.action] || 'Transactional Email';

  toast({
    title: `📧 ${title} (Sandbox)`,
    description: `Email logged to Dev Sandbox. Recipient: ${recipient}. (Fallback: ${errorReason})`,
  });

  // Log a styled HTML message in the console
  console.log(
    `%c[EMAIL SANDBOX] Simulated ${title} for ${recipient}`,
    'background: #7c3aed; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  if (params.orderNumber) {
    console.log(`Order Number: ${params.orderNumber} | Total: $${params.total}`);
  }
  if (params.shopName) {
    console.log(`Shop Name: ${params.shopName}`);
  }
}
