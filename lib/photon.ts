import { createHmac, timingSafeEqual } from "crypto";
import { butterbase } from "./butterbase";
import type { Platform, Student } from "./types";

export interface PhotonWebhookMessage {
  courseId: string;
  studentId: string;
  message: string;
  platform: Platform;
  channelId?: string;
  senderId?: string;
  providerMessageId?: string;
}

interface SpectrumMessagePayload {
  event?: string;
  space?: { id?: string; platform?: string };
  message?: {
    id?: string;
    platform?: string;
    direction?: string;
    sender?: { id?: string };
    content?: { type?: string; text?: string };
  };
}

const signatureToleranceSeconds = 5 * 60;

export function verifySpectrumSignature(input: {
  rawBody: string;
  timestamp?: string | null;
  signature?: string | null;
  signingSecret?: string;
}) {
  if (!input.signingSecret) return;
  if (!input.timestamp || !input.signature) {
    throw new Error("Missing Spectrum signature headers.");
  }

  const timestamp = Number(input.timestamp);
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (!Number.isFinite(age) || age > signatureToleranceSeconds) {
    throw new Error("Stale Spectrum webhook timestamp.");
  }

  const expected =
    "v0=" +
    createHmac("sha256", input.signingSecret)
      .update(`v0:${input.timestamp}:${input.rawBody}`)
      .digest("hex");
  const actual = input.signature;
  if (expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    throw new Error("Invalid Spectrum webhook signature.");
  }
}

export async function parsePhotonWebhook(rawBody: string, headers?: Headers): Promise<PhotonWebhookMessage> {
  verifySpectrumSignature({
    rawBody,
    timestamp: headers?.get("x-spectrum-timestamp"),
    signature: headers?.get("x-spectrum-signature"),
    signingSecret: process.env.SPECTRUM_SIGNING_SECRET ?? process.env.PHOTON_WEBHOOK_SECRET
  });

  const payload = JSON.parse(rawBody) as SpectrumMessagePayload & {
    courseId?: string;
    course_id?: string;
    studentId?: string;
    student_id?: string;
    message?: string;
    text?: string;
    platform?: Platform;
    channelId?: string;
  };

  if (payload.event === "messages" && payload.message) {
    if (payload.message.direction && payload.message.direction !== "inbound") {
      throw new Error("Ignoring non-inbound Spectrum message.");
    }
    if (payload.message.content?.type !== "text" || !payload.message.content.text) {
      throw new Error("Zargar currently handles Spectrum text messages only.");
    }
    const courseId = payload.courseId ?? payload.course_id ?? process.env.PHOTON_DEFAULT_COURSE_ID ?? process.env.SPECTRUM_DEFAULT_COURSE_ID;
    if (!courseId) throw new Error("Set PHOTON_DEFAULT_COURSE_ID for Spectrum webhook messages.");
    const platform = normalizePlatform(payload.message.platform ?? payload.space?.platform);
    const student = await resolveMessagingStudent({
      courseId,
      platform,
      senderId: payload.message.sender?.id ?? payload.space?.id ?? "unknown"
    });
    return {
      courseId,
      studentId: student.id,
      message: payload.message.content.text,
      platform,
      channelId: payload.space?.id,
      senderId: payload.message.sender?.id,
      providerMessageId: payload.message.id
    };
  }

  const courseId = payload.courseId ?? payload.course_id;
  const studentId = payload.studentId ?? payload.student_id;
  const message = payload.message ?? payload.text;
  if (!courseId || !studentId || !message) {
    throw new Error("Photon webhook requires courseId, studentId, and message.");
  }
  return {
    courseId,
    studentId,
    message,
    platform: payload.platform ?? "photon",
    channelId: payload.channelId
  };
}

export async function resolveMessagingStudent(input: { courseId: string; platform: Platform; senderId: string }) {
  const senderKey = messagingIdentity(input.platform, input.senderId);
  const students = await butterbase.listStudents(input.courseId);
  const existing = students.find((student) => student.email === senderKey || student.join_token === senderKey);
  if (existing) return existing;

  return butterbase.createStudent({
    course_id: input.courseId,
    name: displayNameForSender(input.platform, input.senderId),
    email: senderKey
  });
}

export function normalizePlatform(value?: string): Platform {
  const normalized = value?.toLowerCase().replace(/\s+/g, "");
  if (normalized === "imessage") return "imessage";
  if (normalized === "whatsappbusiness" || normalized === "whatsapp") return "whatsapp";
  if (normalized === "terminal") return "terminal";
  if (normalized === "slack") return "slack";
  if (normalized === "telegram") return "telegram";
  return "photon";
}

function messagingIdentity(platform: Platform, senderId: string) {
  return `${platform}:${senderId}`;
}

function displayNameForSender(platform: Platform, senderId: string) {
  if (platform === "imessage" || platform === "whatsapp") return senderId;
  return `${platform} ${senderId}`;
}

// The live Spectrum SDK replies through message.reply()/space.send().
// This fallback exists for local JSON webhook smoke tests only.
export async function sendMessage(input: { channelId?: string; studentId: string; courseId: string; text: string }) {
  return {
    delivered: false,
    provider: "spectrum_webhook_ack_only",
    ...input
  };
}
