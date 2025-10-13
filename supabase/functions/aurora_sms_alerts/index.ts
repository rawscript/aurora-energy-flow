import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// Africa's Talking configuration
const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY");
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME");
const AT_BASE_URL = "https://api.africastalking.com/version1";

// SMS sender name
const SMS_SENDER_NAME = "AURORA";

serve(async (req) => {
    // Handle OPTIONS request for CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        const body = await req.json();
        const {
            action,
            user_id,
            phone_number,
            message,
            alert_type = 'general',
            metadata = {}
        } = body;

        if (!AT_API_KEY || !AT_USERNAME) {
            return new Response(JSON.stringify({
                error: "Africa's Talking credentials not configured",
                code: "MISSING_CREDENTIALS"
            }), {
                headers: corsHeaders,
                status: 500,
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        let result;

        if (action === "send_alert") {
            if (!phone_number || !message) {
                return new Response(JSON.stringify({
                    error: "phone_number and message are required",
                    code: "MISSING_PARAMETERS"
                }), {
                    headers: corsHeaders,
                    status: 400,
                });
            }

            result = await sendSMSAlert(supabase, phone_number, message, alert_type, user_id, metadata);
        } else if (action === "send_bulk_alerts") {
            const { recipients } = body;
            if (!recipients || !Array.isArray(recipients)) {
                return new Response(JSON.stringify({
                    error: "recipients array is required for bulk alerts",
                    code: "MISSING_RECIPIENTS"
                }), {
                    headers: corsHeaders,
                    status: 400,
                });
            }

            result = await sendBulkSMSAlerts(supabase, recipients, alert_type, metadata);
        } else if (action === "get_alert_status") {
            const { alert_id } = body;
            if (!alert_id) {
                return new Response(JSON.stringify({
                    error: "alert_id is required",
                    code: "MISSING_ALERT_ID"
                }), {
                    headers: corsHeaders,
                    status: 400,
                });
            }

            result = await getAlertStatus(supabase, alert_id);
        } else {
            return new Response(JSON.stringify({
                error: "Invalid action. Supported actions: send_alert, send_bulk_alerts, get_alert_status",
                code: "INVALID_ACTION"
            }), {
                headers: corsHeaders,
                status: 400,
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: result,
            metadata: {
                timestamp: new Date().toISOString(),
                sender: SMS_SENDER_NAME,
                action: action
            }
        }), {
            headers: corsHeaders,
        });

    } catch (error) {
        console.error("Unexpected error in aurora_sms_alerts:", {
            message: error.message,
            stack: error.stack,
        });
        return new Response(JSON.stringify({
            error: error.message || "An unexpected error occurred while processing SMS alert.",
            code: "UNEXPECTED_ERROR",
            timestamp: new Date().toISOString()
        }), {
            headers: corsHeaders,
            status: 500,
        });
    }
});

async function sendSMSAlert(
    supabase: any,
    phoneNumber: string,
    message: string,
    alertType: string,
    userId?: string,
    metadata: any = {}
) {
    try {
        // Format phone number (ensure it starts with +254)
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Send SMS via Africa's Talking
        const smsResult = await sendSMS(formattedPhone, message);

        if (!smsResult.success) {
            throw new Error(`Failed to send SMS: ${smsResult.error}`);
        }

        // Store alert in database
        const { data: alertData, error: storeError } = await supabase
            .from('sms_alerts')
            .insert({
                user_id: userId,
                phone_number: formattedPhone,
                message: message,
                alert_type: alertType,
                status: smsResult.messageId ? 'sent' : 'failed',
                message_id: smsResult.messageId,
                cost: smsResult.cost || 0,
                sent_at: new Date().toISOString(),
                metadata: {
                    ...metadata,
                    sender_name: SMS_SENDER_NAME,
                    at_response: smsResult.rawResponse
                }
            })
            .select()
            .single();

        if (storeError) {
            console.error("Error storing SMS alert:", storeError);
        }

        return {
            success: true,
            alert_id: alertData?.id,
            message_id: smsResult.messageId,
            status: smsResult.messageId ? 'sent' : 'failed',
            cost: smsResult.cost,
            phone_number: formattedPhone
        };

    } catch (error) {
        console.error('SMS alert send error:', error);
        return { success: false, error: error.message };
    }
}

async function sendBulkSMSAlerts(
    supabase: any,
    recipients: Array<{ phone_number: string, message: string, user_id?: string }>,
    alertType: string,
    metadata: any = {}
) {
    try {
        const results = [];

        // Process recipients in batches of 100 (Africa's Talking limit)
        const batchSize = 100;
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            for (const recipient of batch) {
                const result = await sendSMSAlert(
                    supabase,
                    recipient.phone_number,
                    recipient.message,
                    alertType,
                    recipient.user_id,
                    metadata
                );
                results.push({
                    phone_number: recipient.phone_number,
                    ...result
                });
            }

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < recipients.length) {
                await delay(1000);
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
            success: true,
            total_sent: successCount,
            total_failed: failureCount,
            results: results
        };

    } catch (error) {
        console.error('Bulk SMS alert error:', error);
        return { success: false, error: error.message };
    }
}

async function getAlertStatus(supabase: any, alertId: string) {
    try {
        const { data, error } = await supabase
            .from('sms_alerts')
            .select('*')
            .eq('id', alertId)
            .single();

        if (error) {
            throw new Error(`Alert not found: ${error.message}`);
        }

        return {
            success: true,
            alert: data
        };

    } catch (error) {
        console.error('Get alert status error:', error);
        return { success: false, error: error.message };
    }
}

async function sendSMS(to: string, message: string) {
    try {
        const response = await fetch(`${AT_BASE_URL}/messaging`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': AT_API_KEY!,
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                username: AT_USERNAME!,
                to: to,
                message: message,
                from: SMS_SENDER_NAME
            })
        });

        const result = await response.json();

        if (result.SMSMessageData && result.SMSMessageData.Recipients) {
            const recipient = result.SMSMessageData.Recipients[0];
            if (recipient.status === 'Success') {
                return {
                    success: true,
                    messageId: recipient.messageId,
                    cost: recipient.cost,
                    rawResponse: result
                };
            } else {
                return {
                    success: false,
                    error: recipient.status,
                    rawResponse: result
                };
            }
        }

        return {
            success: false,
            error: 'Invalid response format',
            rawResponse: result
        };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return { success: false, error: error.message };
    }
}

function formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
        // Convert 0712345678 to +254712345678
        cleaned = '+254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        // Convert 254712345678 to +254712345678
        cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+254')) {
        // Assume it's a local number and add +254
        cleaned = '+254' + cleaned;
    }

    return cleaned;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}