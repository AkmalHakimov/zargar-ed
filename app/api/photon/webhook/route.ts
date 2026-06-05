import { NextResponse } from "next/server";
import { processStudentMessage } from "@/lib/agent";
import { parsePhotonWebhook, sendMessage } from "@/lib/photon";

export async function POST(request: Request) {
  try {
    const event = await parsePhotonWebhook(await request.json());
    const result = await processStudentMessage({
      courseId: event.courseId,
      studentId: event.studentId,
      message: event.message,
      platform: event.platform
    });
    const delivery = await sendMessage({
      channelId: event.channelId,
      courseId: event.courseId,
      studentId: event.studentId,
      text: result.response
    });
    return NextResponse.json({ ok: true, response: result.response, delivery });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

