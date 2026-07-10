-- Synced from db/migrations/007_college_calendar_interview_slot_event_type.sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'college_calendar_event_type_check'
      AND table_name = 'college_calendar'
  ) THEN
    ALTER TABLE college_calendar DROP CONSTRAINT college_calendar_event_type_check;
  END IF;
END $$;

ALTER TABLE college_calendar
ADD CONSTRAINT college_calendar_event_type_check
CHECK (
  event_type IN (
    'exam',
    'holiday',
    'festival',
    'placement_drive',
    'interview_slot',
    'workshop',
    'other'
  )
);
