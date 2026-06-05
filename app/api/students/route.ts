import { NextResponse } from "next/server";
import { butterbase } from "@/lib/butterbase";

export async function POST(request: Request) {
  const body = await request.json();
  const student = await butterbase.createStudent({
    course_id: body.courseId,
    name: body.name,
    email: body.email
  });
  return NextResponse.json({ student, chatUrl: `/chat/${student.course_id}/${student.id}` }, { status: 201 });
}

