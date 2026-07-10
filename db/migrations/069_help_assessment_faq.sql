-- Help widget FAQs for assessment CSV / online update and offers upload menu changes (2026-05-29).

DELETE FROM documentation_faq
WHERE screen_tag IN ('S-26', 'S-48', 'S-85', 'S-86', 'S-87', 'GLOBAL')
  AND (
    question ILIKE '%assessment%'
    OR question ILIKE '%hiring results%'
    OR question ILIKE '%offers%csv%'
    OR question ILIKE '%upload offers%'
    OR answer ILIKE '%Edit'' icon%hiring assessment%'
  );

INSERT INTO documentation_faq (screen_tag, question, answer, sort_order) VALUES
  ('S-26', 'What is Hiring Assessment for college admins?', 'Read-only mirror of employer assessment round results for your campus. Data comes from employer Assessment uploads (CSV) or Assessment Update Online — you cannot edit rows here.', 0),
  ('S-26', 'How do employer assessment updates reach this screen?', 'When an employer exports, edits, and uploads a CSV — or saves changes on Assessment Update Online — the same round outcomes appear here after refresh.', 1),
  ('S-26', 'Can I export hiring assessment data?', 'Yes. Use Export CSV on this screen for campus reporting.', 2),
  ('S-26', 'Can I edit assessment round results here?', 'No. Ask the employer to update via Assessment uploads (CSV) or Assessment Update Online.', 3),

  ('S-48', 'What is the Hiring Results Dashboard?', 'Read-only consolidated view of assessment round outcomes by opportunity type (Internship, Jobs, Drive, Projects). Employers do not edit here.', 0),
  ('S-48', 'How do I update assessment round results?', 'Use Assessment uploads (CSV) — export, edit round columns, upload — or Assessment Update Online for inline edits. Configure round display names in Assessment map first.', 1),
  ('S-48', 'Can I export data from this screen?', 'Yes. Tabbed Export CSV is available for reporting.', 2),
  ('S-48', 'Do assessment updates send email to students?', 'No. Updates appear on this dashboard and on the college Hiring Assessment view only.', 3),

  ('S-85', 'What is Assessment uploads (CSV)?', 'Tabbed screen to export all applications per opportunity type and upload round results as CSV. Round display names come from Assessment map — no column-mapping dialog on upload.', 0),
  ('S-85', 'How do I get the correct CSV format?', 'Click Export CSV on the tab you need (Internship, Jobs, Drive, or Projects). Edit round_1…round_5 and re-upload the same file structure.', 1),
  ('S-85', 'Which columns identify each applicant?', 'Use college_roll_no plus job_id or placement_drive_id per row as exported. Do not rename headers.', 2),
  ('S-85', 'Where do uploaded results appear?', 'On Hiring Results Dashboard (employer) and college Hiring Assessment (read-only).', 3),

  ('S-86', 'What is Assessment Update Online?', 'Tabbed table of applications where you edit round results inline and Save — an alternative to export → edit CSV → upload.', 0),
  ('S-86', 'Do I need to configure round names first?', 'Yes. Save round display labels in Assessment map before editing; the same labels apply to CSV upload.', 1),
  ('S-86', 'Can I use this for internships and projects?', 'Yes. Pick the Internship or Projects tab — same workflow as Jobs and Drive.', 2),

  ('S-87', 'What is Assessment map?', 'Configure display names for round_1…round_5 per opportunity type. CSV upload and Assessment Update Online use these labels automatically.', 0),
  ('S-87', 'Do I set round names on each CSV upload?', 'No. Save labels here once per kind; uploads apply them server-side.', 1),

  ('GLOBAL', 'Where is Upload offers (CSV)?', 'Open Offers from your sidebar, then use the upload link on that page. It is not a separate sidebar menu item for employers or colleges.', 50),
  ('GLOBAL', 'How do employers record assessment round results?', 'Assessment map → Assessment uploads (CSV) or Assessment Update Online → review on Hiring Results Dashboard.', 51);
