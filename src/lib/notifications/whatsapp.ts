import { logger } from "../security/logger";

export interface NormalizedPhoneResult {
  isValid: boolean;
  normalized?: string; // Formatted as 628xxxxxxxxxx
  formattedDisplay?: string; // Formatted as 0812-xxxx-xxxx
  masked?: string; // Formatted as 0812-****-7890
  error?: string;
}

/**
 * Normalizes Indonesian mobile phone numbers.
 * Supports:
 * - 081234567890
 * - +6281234567890
 * - 6281234567890
 * - 0812-3456-7890
 */
export function normalizeIndonesianPhoneNumber(raw: string): NormalizedPhoneResult {
  if (!raw || typeof raw !== "string") {
    return { isValid: false, error: "Nomor WhatsApp wajib diisi." };
  }

  // Remove whitespace, dashes, plus, dots, parentheses
  let cleaned = raw.replace(/[\s\-\+\.\(\)]/g, "");

  // Convert leading 0 or raw 8 to 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  // Check prefix 628 and valid length (11 to 14 digits)
  // Indonesian mobile numbers are 62811xxxx to 62899xxxx, total length 11 to 14 digits
  const indonesianMobileRegex = /^628[1-9][0-9]{7,10}$/;

  if (!indonesianMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      error: "Format nomor WhatsApp tidak valid. Masukkan nomor seluler Indonesia aktif (contoh: 081234567890).",
    };
  }

  const localFormat = "0" + cleaned.slice(2);
  const masked =
    localFormat.slice(0, 4) +
    "-****-" +
    localFormat.slice(-4);

  const formattedDisplay =
    localFormat.length >= 11
      ? `${localFormat.slice(0, 4)}-${localFormat.slice(4, 8)}-${localFormat.slice(8)}`
      : localFormat;

  return {
    isValid: true,
    normalized: cleaned,
    formattedDisplay,
    masked,
  };
}

export interface SendWhatsAppInviteOptions {
  to: string; // Normalized phone: 628xxxxxxxxxx
  code: string;
  expiresInMinutes?: number;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Sends an invitation / OTP code via WhatsApp.
 * Supports:
 * - Mock / Simulation (default in development or if API token not set)
 * - Fonnte (popular Indonesia WhatsApp gateway)
 * - Generic Webhook
 */
export async function sendWhatsAppInviteCode({
  to,
  code,
  expiresInMinutes = 15,
}: SendWhatsAppInviteOptions): Promise<SendWhatsAppResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const apiUrl = process.env.WHATSAPP_API_URL;

  const message = [
    "🛡️ *[Lawan Doxing Platform]*",
    "Kode akses Anda untuk mengirim laporan bukti pelanggaran adalah:",
    "",
    `👉 *${code}* 👈`,
    "",
    `⏱️ Kode ini berlaku selama ${expiresInMinutes} menit dan hanya dapat digunakan 1 kali.`,
    "🔒 Demi kerahasiaan dan keamanan Anda, jangan bagikan kode ini kepada pihak lain.",
    "",
    "_Situs Lawan Doxing & Perlindungan Korban Penagihan Ilegal_",
  ].join("\n");

  // If mock or token is missing, use dev simulation
  if (provider === "mock" || !apiToken) {
    logger.info("Simulated WhatsApp Message Dispatched", {
      to,
      code,
      provider: "mock",
    });

    console.log("\n=======================================================");
    console.log(`📱 [SIMULASI WHATSAPP GATEWAY]`);
    console.log(`Penerima : +${to}`);
    console.log(`Kode OTP : ${code}`);
    console.log(`Masa     : ${expiresInMinutes} menit`);
    console.log("=======================================================\n");

    return {
      success: true,
      messageId: `sim_${Date.now()}`,
      isSimulated: true,
    };
  }

  // Fonnte Provider Integration (api.fonnte.com/send)
  if (provider === "fonnte") {
    const targetUrl = apiUrl || "https://api.fonnte.com/send";
    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: to,
          message,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.status === false)) {
        const errorMsg = data?.reason || `Fonnte HTTP ${response.status}`;
        logger.error("Failed to send WhatsApp message via Fonnte", errorMsg, { to });
        return { success: false, error: errorMsg };
      }

      logger.info("WhatsApp sent via Fonnte successfully", { to, id: data?.id });
      return { success: true, messageId: data?.id || String(Date.now()) };
    } catch (err: unknown) {
      logger.error("Network error sending WhatsApp via Fonnte", err, { to });
      return { success: false, error: "Gagal menghubungi server gateway WhatsApp." };
    }
  }

  // Generic Webhook Provider Integration
  if (provider === "generic_webhook" && apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          to,
          message,
          code,
          expiresInMinutes,
        }),
      });

      if (!response.ok) {
        const errorMsg = `Webhook HTTP ${response.status}`;
        logger.error("Failed to send WhatsApp via generic webhook", errorMsg, { to });
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err: unknown) {
      logger.error("Network error sending WhatsApp via generic webhook", err, { to });
      return { success: false, error: "Gagal menghubungi webhook WhatsApp." };
    }
  }

  // Fallback to simulation if provider unrecognized
  logger.warn(`Unrecognized WHATSAPP_PROVIDER '${provider}', fell back to simulation.`);
  return {
    success: true,
    isSimulated: true,
  };
}
