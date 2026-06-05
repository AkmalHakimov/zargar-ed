import { NextResponse } from "next/server";
import { butterbase } from "@/lib/butterbase";

export async function GET() {
  return NextResponse.json(await butterbase.listCourses());
}

export async function POST(request: Request) {
  const body = await request.json();
  const course = await butterbase.createCourse({
    title: body.title,
    description: body.description ?? "",
    material: body.material ?? "",
    professor_id: body.professor_id
  });
  return NextResponse.json({ course, inviteLink: `/join/${course.id}` }, { status: 201 });
}

