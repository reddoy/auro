"use server";

export async function sendOpsAlert(subject: string, details?: Record<string, unknown>) {
  const webhookUrl = process.env.OPERATIONS_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const body =
    details && Object.keys(details).length > 0
      ? `${subject}\n\`\`\`\n${JSON.stringify(details, null, 2)}\n\`\`\``
      : subject;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body }),
    });
  } catch (error) {
    console.error("[ops-alert] Failed to send alert", error);
  }
}


