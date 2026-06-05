import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zargar — AI-guided study professors can see",
  description: "Turn course materials into personalized study chats with persistent learning memory"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-dot" />
              Zargar
            </Link>
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/courses/new">Courses</Link>
              <Link href="/join/course_ai101">Student view</Link>
              <Link href="/chat/course_ai101/student_maya">Student chat</Link>
              <Link className="nav-cta" href="/courses/new">
                Create course
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
