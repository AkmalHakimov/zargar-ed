-- Zargar Butterbase Launch schema
-- Create these tables in your Butterbase project database.

create table courses (
  id text primary key,
  professor_id text not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table course_resources (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  title text not null,
  content text not null,
  resource_type text not null,
  created_at timestamptz not null default now()
);

create table students (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  name text not null,
  email text not null,
  join_token text not null,
  created_at timestamptz not null default now()
);

create table chat_messages (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  role text not null check (role in ('student', 'tutor')),
  content text not null,
  platform text not null check (platform in ('web', 'photon', 'slack', 'telegram')),
  created_at timestamptz not null default now()
);

create table student_learning_state (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  status text not null check (status in ('behind', 'on_track', 'ahead', 'improving', 'inactive')),
  weak_topics text[] not null default '{}',
  strong_topics text[] not null default '{}',
  misconceptions text[] not null default '{}',
  growth_summary text not null default '',
  last_activity timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table learning_events (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  event_type text not null check (
    event_type in ('confusion', 'improvement', 'misconception', 'mastery', 'advanced_question', 'inactivity')
  ),
  topic text not null,
  description text not null,
  evidence_message_id text not null references chat_messages(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index course_resources_course_id_idx on course_resources(course_id);
create index students_course_id_idx on students(course_id);
create index chat_messages_student_time_idx on chat_messages(student_id, created_at desc);
create index student_learning_state_course_idx on student_learning_state(course_id);
create index learning_events_student_time_idx on learning_events(student_id, created_at desc);
