import type { Platform } from "./types";

export interface PhotonWebhookMessage {
  courseId: string;
  studentId: string;
  message: string;
  platform: Platform;
  channelId?: string;
}

// TODO(Photon/Spectrum): Validate signatures with PHOTON_WEBHOOK_SECRET and normalize real Photon payloads.
export async function parsePhotonWebhook(payload: unknown): Promise<PhotonWebhookMessage> {
  const body = payload as Partial<PhotonWebhookMessage> & {
    course_id?: string;
    student_id?: string;
    text?: string;
  };
  const courseId = body.courseId ?? body.course_id;
  const studentId = body.studentId ?? body.student_id;
  const message = body.message ?? body.text;
  if (!courseId || !studentId || !message) {
    throw new Error("Photon webhook requires courseId, studentId, and message.");
  }
  return {
    courseId,
    studentId,
    message,
    platform: body.platform ?? "photon",
    channelId: body.channelId
  };
}

// TODO(Photon/Spectrum): Replace with Photon send API call using PHOTON_API_URL and PHOTON_API_KEY.
export async function sendMessage(input: { channelId?: string; studentId: string; courseId: string; text: string }) {
  return {
    delivered: Boolean(process.env.PHOTON_API_KEY),
    provider: "photon_mock",
    ...input
  };
}

