import { NextResponse } from "next/server";
import { processStudentMessage } from "@/lib/agent";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await processStudentMessage({
    courseId: body.courseId,
    studentId: body.studentId,
    message: body.message,
    platform: body.platform ?? "web"
  });
  return NextResponse.json(result);
}

