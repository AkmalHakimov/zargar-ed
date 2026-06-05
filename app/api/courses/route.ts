import { NextResponse } from "next/server";
import { butterbase } from "@/lib/butterbase";
import type { CourseResourceInput } from "@/lib/butterbase";

export async function GET() {
  return NextResponse.json(await butterbase.listCourses());
}

export async function POST(request: Request) {
  try {
    const body = await readCourseRequest(request);
    const course = await butterbase.createCourse({
      title: body.title,
      description: body.description ?? "",
      material: body.material ?? "",
      resources: body.resources,
      professor_id: body.professor_id
    });
    return NextResponse.json({ course, inviteLink: `/join/${course.id}` }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the course." },
      { status: 400 }
    );
  }
}

async function readCourseRequest(request: Request): Promise<{
  title: string;
  description?: string;
  material?: string;
  professor_id?: string;
  resources: CourseResourceInput[];
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body = await request.json();
    return {
      title: String(body.title ?? ""),
      description: body.description ? String(body.description) : "",
      material: body.material ? String(body.material) : "",
      professor_id: body.professor_id ? String(body.professor_id) : undefined,
      resources: []
    };
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  const resources = await Promise.all(files.map(fileToCourseResource));

  return {
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    material: String(form.get("material") ?? ""),
    professor_id: form.get("professor_id") ? String(form.get("professor_id")) : undefined,
    resources
  };
}

async function fileToCourseResource(file: File): Promise<CourseResourceInput> {
  if (!isReadableTextFile(file)) {
    throw new Error(`Unsupported material file: ${file.name}. Upload PDF, text, Markdown, CSV, JSON, HTML, or code files.`);
  }

  const content = await extractFileText(file);
  if (!content.trim()) {
    throw new Error(`Could not read text from ${file.name}.`);
  }

  return {
    title: file.name,
    content: content.slice(0, 200_000),
    resource_type: `uploaded_${fileExtension(file.name) || "text"}`
  };
}

function isReadableTextFile(file: File) {
  if (file.type === "application/pdf" || fileExtension(file.name) === "pdf") return true;
  if (file.type.startsWith("text/")) return true;
  if (["application/json", "application/xml", "application/x-ndjson"].includes(file.type)) return true;
  return [
    "csv",
    "html",
    "js",
    "json",
    "jsx",
    "md",
    "mdx",
    "pdf",
    "py",
    "rst",
    "ts",
    "tsx",
    "txt",
    "xml",
    "yaml",
    "yml"
  ].includes(fileExtension(file.name));
}

function fileExtension(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

async function extractFileText(file: File) {
  if (file.type === "application/pdf" || fileExtension(file.name) === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    try {
      const data = await parser.getText();
      return data.text;
    } finally {
      await parser.destroy();
    }
  }

  return file.text();
}
