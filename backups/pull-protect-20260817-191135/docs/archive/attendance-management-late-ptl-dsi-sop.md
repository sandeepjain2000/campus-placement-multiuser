# Attendance Management SOP: Late, PTL, and DSI

## 1. Purpose

This SOP explains how staff should manage attendance using Unique Schools, with particular focus on:

- Attendance Overview / Year Head Dashboard
- Digital Sign-In/Out device (DSI)
- Late arrivals
- Permission to Leave (PTL)
- Please Checks
- Anomalies
- Integration differences across Tyro, VSware, and Compass

The goal is to keep attendance records accurate, keep parents informed, and ensure that student movement in and out of school is recorded clearly for safeguarding.

## 2. Audience

This guide is intended for:

- Attendance Officers
- Office Staff
- Year Heads
- Tutors with attendance responsibilities
- Deputy Principals and Principals
- Staff involved in parent attendance communications

Access is role-based. Year Heads and Tutors usually see only their assigned year groups. Principal, Deputy Principal, Attendance Officer, and Office Staff roles can usually access all student data.

## 3. Core Principle

Parent notes explain the reason or intention. The DSI device records the actual movement.

For example:

- A parent PTL note says the student is expected to leave.
- DSI confirms whether and when the student actually signed out.
- A parent late note explains why a student will be late.
- DSI confirms whether and when the student actually arrived.

Staff should avoid treating a parent note as proof that the attendance event happened. The actual movement should be confirmed through DSI or the agreed office sign-in/sign-out process.

## 4. System Components

### 4.1 Attendance Overview

Attendance Overview is the main staff area for managing attendance. It displays today's attendance by default, with filters for other dates and date ranges.

Main sections include:

- Absences
- Lates
- PTL
- Please Checks
- Anomalies
- Attendance alerts / threshold notifications
- Student profile access

### 4.2 DSI: Digital Sign-In/Out Device

The DSI device is used by students to record movement during the school day.

The main DSI actions are:

| DSI action | Used when | Expected result |
|---|---|---|
| Late | Student arrives after expected start / roll call | Arrival time is recorded; parent is notified or asked for a late note |
| Leaving | Student leaves early with PTL | Departure time is recorded; parent receives confirmation |
| Returning | Student comes back after leaving earlier | Return time is recorded |

Students should use the DSI device even when a parent note already exists, because the device captures the actual timestamp.

### 4.3 Parent Notes

Parents may submit:

- Absence notes
- Late notes
- Permission to Leave notes
- Responses to absence requests

Parent notes should be reviewed alongside attendance-system marks and DSI activity.

### 4.4 External Attendance Systems

Unique Schools may sync or interact with external systems differently depending on the provider.

| System | Integration level | Attendance handling impact |
|---|---|---|
| Tyro | Full API integration | Immediate sync, class-roll access, smart late detection, automated PTL push |
| VSware | Partial integration through Wonde | Session-roll access only, possible delay, manual PTL processing |
| Compass | Manual | No API access; AFM team handles actions manually |

## 5. Daily Operating Routine

Use this routine as the default daily rhythm.

1. Check Attendance Overview after AM roll call.
2. Review absences and outstanding absence requests.
3. Action Please Checks promptly, especially where a parent believes the student is in school.
4. Monitor Lates through the morning.
5. Ensure students arriving late use DSI.
6. Review and approve PTL requests before the requested leaving times.
7. Ensure students leaving early use DSI or are signed out by office staff.
8. Check for students who returned after leaving and ensure they used the Returning option.
9. Review anomalies daily or weekly, depending on school volume.
10. At the end of the day, review unresolved items:
    - Pending late notes
    - PTLs approved but not signed out
    - Students marked absent but later found present
    - Mismatches between parent notes and attendance codes

## 6. Late Management Process

### 6.1 Standard Late Flow

1. Student arrives late.
2. Student taps Late on the DSI device.
3. Student selects year, class, and name.
4. System checks whether a parent late note already exists.
5. If a note exists, parent receives confirmation that the student arrived.
6. If no note exists, parent receives a late notification / late note request.
7. Staff review the record in Attendance Overview > Lates.
8. Staff classify and follow up as needed.

### 6.2 Late Statuses

| Status | Meaning | Staff action |
|---|---|---|
| Authorised | Parent gave a valid reason | Review only, unless school policy requires follow-up |
| Unauthorised | No valid reason or reason not accepted | Follow school policy, possibly detention or parent notification |
| Pending | Waiting for parent to submit late note | Monitor and follow up |
| Note Received | Parent submitted the late note | Review reason and status |
| Requested | System or staff requested a late note | Await parent response |

### 6.3 Staff Actions for Lates

Staff can:

- Filter by date, year, class, sign-in status, note status, and authorisation status.
- Filter by late count to identify repeated late arrivals.
- Add a manual Late Request when a student bypasses DSI.
- Send a Personal Notification to parents.
- Add students to detention where school policy applies.
- Delete incorrect late records.
- Export data, although the live dashboard is preferred because exports become outdated quickly.

### 6.4 Important Late Rule

Students must sign in on DSI for all late arrivals, even if a parent submitted a note in advance.

Reason: the parent note explains why the student is late, but DSI records the actual arrival time and triggers the correct parent confirmation.

## 7. PTL: Permission to Leave Process

### 7.1 Standard PTL Flow

1. Parent submits a Permission to Leave request through the app.
2. Staff open Attendance Overview > PTL.
3. Pending PTLs for today appear by default.
4. Staff review the request.
5. Staff approve the PTL individually or in bulk.
6. Once approved, the student is permitted to sign out.
7. Student taps Leaving on the DSI device, or office staff sign the student out through the agreed process.
8. The actual departure time is recorded.
9. Parent receives confirmation that the student has left.

### 7.2 Critical PTL Rule

PTL approval alone does not record the student as having left.

The student must sign out through DSI, or the office must complete the sign-out process. This is important for safeguarding and accurate attendance history.

### 7.3 PTL Approval Guidance

Staff should:

- Approve PTLs promptly to avoid delays at sign-out.
- Use bulk approval when there are many requests and all have been reviewed.
- Use the date filter to review future or previous PTLs.
- Use the status filter to review approved, pending, or other PTL statuses.
- Review cumulative PTL patterns where needed.

### 7.4 PTL Settings

Schools may configure:

- A PTL popup message for parents submitting requests after a defined time.
- A DSI sign-out time interval, such as a window before and after the requested leave time.

Example: if a PTL is for 1:30pm and the school allows a 10-minute interval before and after, the student may be able to sign out from 1:20pm to 1:40pm.

## 8. DSI Workflows

### 8.1 DSI Late

Used when a student arrives late.

Expected behavior:

- If a parent note already exists, parent receives arrival confirmation.
- If no parent note exists, parent receives a late note request.
- The dashboard records the actual sign-in time.
- The attendance system may be updated automatically depending on integration.

### 8.2 DSI Leaving

Used when a student leaves early.

Expected behavior:

- Student can sign out only when an appropriate PTL exists and is approved, according to the school's setup.
- Parent receives departure confirmation.
- Actual departure time is recorded.

If there is no PTL, the student should be directed to the office.

### 8.3 DSI Returning

Used when a student returns to school after leaving earlier the same day.

Expected behavior:

- Student records return through DSI.
- Staff have a complete movement history: in school, left, returned.

This matters for safeguarding and for avoiding confusion if the student appears in later roll calls.

## 9. Please Check Process

A Please Check occurs when a parent receives an absence notification and believes the student should be in school.

Parents may respond to an absence notification by selecting:

- Approve: student is absent.
- Mark as Late: student was or will be late.
- Please Check: parent believes the student should be present.

### 9.1 Staff Response

When a Please Check is received:

1. Open Attendance Overview > Please Check.
2. Check subsequent class roll calls if available.
3. Physically check if needed.
4. Decide whether the student is present, late, on school activity, or absent.
5. Apply the correct action.

### 9.2 Possible Outcomes

| Outcome | When to use | Effect |
|---|---|---|
| Mark Present | Student is in school and roll call was wrong | Absence request is cancelled |
| Mark Late | Student arrived late, especially if they bypassed DSI | Absence request is cancelled and parent is updated |
| Mark School Activity | Student is on a trip, match, or school activity | Absence request is cancelled |
| Not In Class - Confirmed | Student is confirmed absent | Parent is asked to complete the absence request |

### 9.3 Parent Selects "Mark as Late"

If a parent indicates the student will be late:

- The absence request is held until the end of the day.
- If the student signs in late, the absence request is cancelled.
- If the student does not arrive, the absence request is sent again the next morning.

## 10. Anomalies Process

Anomalies highlight mismatches between the external attendance system and notes submitted through Unique Schools.

Examples:

- Parent submits an absent note but the student is marked present.
- Parent submits a late note but the student is marked absent.
- Student is marked as school activity but parent submitted an absence note.
- PTL or late activity does not line up with attendance marks.

### 10.1 Staff Action

1. Open Attendance Overview > Anomalies.
2. Review the student, date, AM/PM attendance codes, and note received.
3. Open the note details if needed.
4. Correct the external attendance system if required.
5. Once reviewed, tick the record and mark it acknowledged.

Acknowledging an anomaly does not update the attendance system and does not notify parents. It simply removes the item from the anomaly list so staff know it has been reviewed.

## 11. Use Cases and Edge Cases

| Scenario | What happened | Correct handling |
|---|---|---|
| Parent submits PTL, student leaves correctly | Parent requests early leave; staff approve; student signs out on DSI | No further action unless review is needed |
| Parent submits PTL, but staff do not approve it | Student may try to leave but approval is missing | Student should go to office; staff review and approve only if appropriate |
| PTL approved, but student does not sign out | Request was approved, but there is no departure timestamp | Treat as approved but not actioned; check whether student remained in school, left without DSI, or was signed out manually |
| Parent submits PTL, but student arrives late that morning | Same student has a late arrival and a planned early leave | Manage as two events: student signs in Late on DSI; staff still approve PTL separately; student later signs out using Leaving |
| Parent submits Late note in advance, student signs in late | Reason exists before arrival | Student must still use DSI; parent receives arrival confirmation |
| Parent submits Late note, but student never arrives | Parent expected late arrival, but no DSI sign-in occurs | Check roll calls; if absent, handle as absence and review anomaly if note type mismatches attendance |
| Student arrives late but bypasses DSI | Student is present but no DSI timestamp exists | Staff may manually add Late Request or mark Late through Please Check; reinforce DSI use |
| Student is marked absent, parent says student is in school | Parent selects Please Check | Verify class rolls or physically check; mark Present, Late, School Activity, or Confirmed Absent |
| Parent selects Mark as Late from absence request | Parent expects student to arrive late | System holds absence request; cancel if DSI late occurs; resend next morning if student never arrives |
| Student tries to leave without PTL | Student taps Leaving but no approved PTL exists | DSI should direct student to office; staff follow school procedure |
| Student leaves and returns same day | Student has PTL and later comes back | Student uses Leaving, then Returning; staff ensure both timestamps exist |
| Parent submits wrong note type | Note does not match attendance code | Review Anomalies; correct attendance system if needed; acknowledge anomaly after review |
| Student is on a school trip but marked absent | Attendance code does not reflect school activity | Mark School Activity where appropriate; cancel unnecessary absence request |
| Teacher overwrites attendance after a note was processed | Attendance code changes after initial action | Review dashboard or automation outcome; use anomaly / monitoring where available |

## 12. Integration Differences

### 12.1 Tyro

Tyro provides the strongest automation.

Key behavior:

- Direct API access.
- AM, PM, and class roll access.
- Late sign-ins and PTL sign-outs sync quickly.
- PTL can be pushed automatically.
- Smart late detection can convert AM absence to Late when later class presence indicates the student arrived.
- ARFs can be suppressed where a valid late or PTL rule applies.
- Attendance changes can be monitored retrospectively.

Operational impact:

- Staff still need to review exceptions, but many routine updates can be automated.
- DSI use remains important because it gives the actual timestamp and parent confirmation.

### 12.2 VSware

VSware integration is partial and runs through Wonde.

Key behavior:

- AM and PM session roll access only.
- Possible sync delay.
- No class-roll smart late detection.
- Lates can sync at session-roll level.
- PTL requires manual processing by the Attendance Form Management team.

Operational impact:

- Staff need to be more alert to students who bypass DSI.
- PTL should be reviewed carefully because it is not pushed automatically in the same way as Tyro.

### 12.3 Compass

Compass is manual.

Key behavior:

- No API access.
- No automatic data pull.
- No automatic write-back.
- No automated PTL sync.
- No automated 7-day monitoring.

Operational impact:

- AFM team and school staff must manually manage absence notes, late sign-ins, PTL, corrections, and write-backs.
- Clear internal process is especially important.

## 13. Absence Notifications and Temporary Disable Settings

Schools can temporarily disable absence notifications for special circumstances, such as:

- Exams
- School trips
- Events or non-standard school days
- Cases where students have not yet been marked as School Activity

Staff should only disable notifications when needed and should ensure normal notifications resume after the relevant date range.

If notifications are disabled incorrectly, parents may not receive expected absence alerts. If they remain enabled during non-standard days, parents may receive unnecessary or incorrect alerts.

## 14. Staff Checklist

### Morning

- Check Attendance Overview after AM roll.
- Review absences and requested absence notes.
- Monitor Please Checks.
- Confirm late students use DSI.
- Add manual Late Requests where students bypassed DSI.

### Midday

- Review PTLs due later in the day.
- Approve valid PTLs promptly.
- Check unresolved late requests.
- Review students on trips or activities to avoid incorrect absence requests.

### Afternoon

- Confirm students with approved PTL actually signed out.
- Confirm returning students used DSI Returning.
- Review PM roll issues.
- Check for absence requests that should be cancelled or updated.

### End of Day

- Review unresolved Please Checks.
- Review pending late notes.
- Check anomalies.
- Confirm PTL records with missing sign-out timestamps.
- Follow school policy for repeated unauthorised lates.

## 15. Quick Decision Guide

| Question | Recommended action |
|---|---|
| Did the parent submit a note? | Review the note, but still verify actual attendance / movement |
| Did the student physically arrive late? | Student should use DSI Late |
| Did the student physically leave early? | Student should use DSI Leaving or office sign-out |
| Did the student return after leaving? | Student should use DSI Returning |
| Does the note conflict with the roll call? | Review Anomalies and correct the attendance system if needed |
| Parent says student is present but roll says absent? | Use Please Check process |
| Student bypassed DSI? | Manually add or correct the late/sign-out record according to school process |
| External attendance system differs from Unique Schools? | Review integration limits, correct source records where required, and acknowledge anomaly |

## 16. Source Basis

This SOP is based on the reviewed HelpJuice materials for:

- Attendance System Integration Processes
- Attendance Overview
- Manage Lates
- Approve Permission to Leave (PTL)
- DSI: Digital Sign-In/Out Device
- Respond to Please Checks
- Anomalies
- Attendance Settings
- PTL Settings
- Administrator App attendance reports

