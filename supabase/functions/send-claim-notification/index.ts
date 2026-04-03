import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { claimId, claimantName, claimantEmail, status, policyNumber, claimedAmount, reason } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const statusConfig: Record<string, { subject: string; color: string; emoji: string; headline: string; bodyText: string }> = {
      SUBMITTED: {
        subject: `Claim ${claimId} Received — InsureSwift`,
        color: "#1d4ed8",
        emoji: "📋",
        headline: "Your Claim Has Been Submitted",
        bodyText: `We've received your claim for policy <strong>${policyNumber}</strong> and our AI system is now processing it. You'll receive updates as your claim progresses through each stage.`,
      },
      PROCESSING: {
        subject: `Claim ${claimId} Is Being Processed — InsureSwift`,
        color: "#7c3aed",
        emoji: "⚙️",
        headline: "Your Claim Is Being Processed",
        bodyText: `Our AI system is actively reviewing your claim for policy <strong>${policyNumber}</strong>. This includes document verification, damage analysis, and fraud checks. We'll notify you once a decision is made.`,
      },
      APPROVED: {
        subject: `✅ Claim ${claimId} Approved — InsureSwift`,
        color: "#059669",
        emoji: "✅",
        headline: "Your Claim Has Been Approved!",
        bodyText: `Great news! Your claim for policy <strong>${policyNumber}</strong> has been <strong>approved</strong>. The approved amount of <strong>₹${Number(claimedAmount).toLocaleString("en-IN")}</strong> will be processed within 3–5 business days.${reason ? `<br/><br/><em>Note: ${reason}</em>` : ""}`,
      },
      REJECTED: {
        subject: `Claim ${claimId} — Decision Update — InsureSwift`,
        color: "#dc2626",
        emoji: "❌",
        headline: "Claim Decision: Not Approved",
        bodyText: `After careful review, your claim for policy <strong>${policyNumber}</strong> could not be approved at this time.${reason ? `<br/><br/><strong>Reason:</strong> ${reason}` : ""}<br/><br/>If you believe this decision is incorrect, please contact our support team with your claim ID.`,
      },
      ESCALATED: {
        subject: `Claim ${claimId} Escalated for Review — InsureSwift`,
        color: "#d97706",
        emoji: "🔍",
        headline: "Your Claim Has Been Escalated",
        bodyText: `Your claim for policy <strong>${policyNumber}</strong> has been escalated to a senior adjuster for manual review. This typically happens for complex claims that require additional human oversight. You'll hear back within 2 business days.`,
      },
      PENDING_REVIEW: {
        subject: `Claim ${claimId} Pending Review — InsureSwift`,
        color: "#0891b2",
        emoji: "⏳",
        headline: "Your Claim Is Pending Review",
        bodyText: `Your claim for policy <strong>${policyNumber}</strong> is currently pending review by our team. We may reach out if additional documentation is required.`,
      },
    };

    const config = statusConfig[status] || statusConfig["SUBMITTED"];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${config.color};padding:28px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">${config.emoji}</div>
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">${config.headline}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>${claimantName}</strong>,</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">${config.bodyText}</p>

              <!-- Claim Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:50%;">Claim ID</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;font-family:monospace;">${claimId}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Policy Number</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${policyNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Claimed Amount</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">₹${Number(claimedAmount).toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Status</td>
                        <td style="padding:6px 0;">
                          <span style="background:${config.color}15;color:${config.color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">${status}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">You can track your claim status in real time on the InsureSwift portal.</p>
              <p style="color:#6b7280;font-size:13px;margin:0;">If you have questions, reply to this email or contact our support team.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">InsureSwift · AI-Powered Insurance Claims Platform</p>
              <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">This is an automated notification. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [claimantEmail],
        subject: config.subject,
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      throw new Error(emailData?.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
