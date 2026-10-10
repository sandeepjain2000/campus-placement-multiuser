import pandas as pd
import os

test_cases = [
    # AUTHENTICATION
    {"Test Case ID": "TC_AUTH_001", "Module": "Authentication", "Scenario": "Student Login", "Description": "Verify that a student can successfully log in using valid credentials.", "Pre-conditions": "User is on /login", "Steps": "1. Enter student email\n2. Enter password\n3. Click Sign In", "Expected Result": "Redirected to /dashboard/student. Dashboard renders.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/auth.spec.js"},
    {"Test Case ID": "TC_AUTH_002", "Module": "Authentication", "Scenario": "Employer Login", "Description": "Verify that an employer can successfully log in using valid credentials.", "Pre-conditions": "User is on /login", "Steps": "1. Enter employer email\n2. Enter password\n3. Click Sign In", "Expected Result": "Redirected to /dashboard/employer. Dashboard renders.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/auth.spec.js"},
    {"Test Case ID": "TC_AUTH_003", "Module": "Authentication", "Scenario": "College Admin Login", "Description": "Verify that a college admin can successfully log in.", "Pre-conditions": "User is on /login", "Steps": "1. Enter admin email\n2. Enter password\n3. Click Sign In", "Expected Result": "Redirected to /dashboard/college. Dashboard renders.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/auth.spec.js"},
    {"Test Case ID": "TC_AUTH_004", "Module": "Authentication", "Scenario": "Invalid Login", "Description": "Verify error message on invalid credentials.", "Pre-conditions": "User is on /login", "Steps": "1. Enter invalid email/password\n2. Click Sign In", "Expected Result": "Error message 'Invalid credentials' is displayed. Access denied.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_AUTH_005", "Module": "Authentication", "Scenario": "Registration - Student", "Description": "Verify student registration flow.", "Pre-conditions": "User is on /register", "Steps": "1. Select Student role\n2. Fill details\n3. Submit", "Expected Result": "Account created. Redirected to success page or login.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_AUTH_006", "Module": "Authentication", "Scenario": "Logout functionality", "Description": "Verify user can log out securely.", "Pre-conditions": "User is logged in", "Steps": "1. Click User Menu\n2. Click Sign Out", "Expected Result": "Session cleared, redirected to /login.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/auth.spec.js"},

    # DASHBOARD & NAVIGATION
    {"Test Case ID": "TC_NAV_001", "Module": "Navigation", "Scenario": "Mega Menu Routing", "Description": "Verify client-side routing from the Dashboard Hub.", "Pre-conditions": "Logged in to Dashboard", "Steps": "1. Click 'My profile'\n2. Verify URL\n3. Click 'Home'", "Expected Result": "Navigates without full page reload. Sidebar remains intact.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/dashboard.spec.js"},
    {"Test Case ID": "TC_NAV_002", "Module": "Navigation", "Scenario": "Theme Toggling", "Description": "Verify light/dark mode switch.", "Pre-conditions": "Logged in", "Steps": "1. Click Theme toggle", "Expected Result": "data-theme attribute changes. CSS variables update.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/dashboard.spec.js"},
    {"Test Case ID": "TC_NAV_003", "Module": "Navigation", "Scenario": "Sidebar Responsiveness", "Description": "Verify sidebar behavior on mobile viewports.", "Pre-conditions": "Logged in", "Steps": "1. Resize window to mobile width\n2. Click hamburger menu", "Expected Result": "Sidebar toggles smoothly as a drawer overlay.", "Status": "Manual", "Automation Script": "N/A"},

    # STUDENT MODULE
    {"Test Case ID": "TC_STU_001", "Module": "Student", "Scenario": "Update Academic Profile", "Description": "Verify student can update CGPA and marks.", "Pre-conditions": "Student is on /dashboard/student/profile", "Steps": "1. Edit CGPA\n2. Click Save", "Expected Result": "Profile updated notification appears. Data persists on reload.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_STU_002", "Module": "Student", "Scenario": "Upload Resume", "Description": "Verify student can upload PDF resume.", "Pre-conditions": "Student is on /dashboard/student/documents", "Steps": "1. Select PDF file\n2. Click Upload", "Expected Result": "Upload successful. File appears in document list.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_STU_003", "Module": "Student", "Scenario": "Apply for Job", "Description": "Verify student can apply for an active placement drive.", "Pre-conditions": "Student is on /dashboard/student/jobs", "Steps": "1. Select Job\n2. Click Apply\n3. Confirm", "Expected Result": "Application status changes to 'Applied'.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_STU_004", "Module": "Student", "Scenario": "View Offers", "Description": "Verify student can see received offers.", "Pre-conditions": "Student is on /dashboard/student/offers", "Steps": "1. Navigate to Offers", "Expected Result": "List of offers received from employers is displayed.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_STU_005", "Module": "Student", "Scenario": "Accept Offer", "Description": "Verify student can accept an offer letter.", "Pre-conditions": "Student has a pending offer", "Steps": "1. Click Accept on offer\n2. Confirm", "Expected Result": "Offer status changes to Accepted. Placement status updates.", "Status": "Manual", "Automation Script": "N/A"},

    # EMPLOYER MODULE
    {"Test Case ID": "TC_EMP_001", "Module": "Employer", "Scenario": "Create Placement Drive", "Description": "Verify employer can create a new drive.", "Pre-conditions": "Employer is on /dashboard/employer/drives", "Steps": "1. Click New Drive\n2. Fill details (Title, criteria)\n3. Submit", "Expected Result": "Drive created and appears in the list as 'Requested'.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_EMP_002", "Module": "Employer", "Scenario": "Review Applications", "Description": "Verify employer can view student applicants.", "Pre-conditions": "Employer has an active drive", "Steps": "1. Open Drive\n2. Click Applications", "Expected Result": "List of applicants matches students who applied.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_EMP_003", "Module": "Employer", "Scenario": "Shortlist Student", "Description": "Verify employer can shortlist an applicant.", "Pre-conditions": "Employer viewing applicants", "Steps": "1. Select student\n2. Click Shortlist", "Expected Result": "Status updates to 'Shortlisted'.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_EMP_004", "Module": "Employer", "Scenario": "Upload Offers via Template", "Description": "Verify employer can upload bulk offers via CSV.", "Pre-conditions": "Employer is on /dashboard/employer/offers", "Steps": "1. Download Template\n2. Fill Template\n3. Upload CSV", "Expected Result": "Offers are parsed and created in pending state.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_EMP_005", "Module": "Employer", "Scenario": "Template Download", "Description": "Verify employer offers page provides CSV template.", "Pre-conditions": "Employer is on /dashboard/employer/offers", "Steps": "1. Click Template button", "Expected Result": ".csv file is downloaded successfully.", "Status": "Automated (Pass)", "Automation Script": "qa/tests/offers.spec.js"},

    # COLLEGE ADMIN MODULE
    {"Test Case ID": "TC_COL_001", "Module": "College Admin", "Scenario": "View Student Directory", "Description": "Verify admin can see all registered students.", "Pre-conditions": "Admin on /dashboard/college/students", "Steps": "1. Navigate to Students", "Expected Result": "Table populates with student records.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_COL_002", "Module": "College Admin", "Scenario": "Approve Placement Drive", "Description": "Verify admin can approve an employer's drive request.", "Pre-conditions": "A drive is in 'Requested' state", "Steps": "1. Open Drive\n2. Click Approve", "Expected Result": "Drive status becomes 'Approved'. Visible to students.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_COL_003", "Module": "College Admin", "Scenario": "Upload Assessment Results", "Description": "Verify admin can import assessment CSV.", "Pre-conditions": "Admin on /dashboard/college/assessments", "Steps": "1. Upload valid CSV", "Expected Result": "Assessment scores are mapped to students.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_COL_004", "Module": "College Admin", "Scenario": "Analytics Dashboard", "Description": "Verify placement stats are calculated correctly.", "Pre-conditions": "Admin on /dashboard/college/overview", "Steps": "1. View Overview", "Expected Result": "Placed count, total offers, and highest LPA are accurate.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_COL_005", "Module": "College Admin", "Scenario": "Export Student Data", "Description": "Verify admin can export student list to CSV.", "Pre-conditions": "Admin on /dashboard/college/students", "Steps": "1. Click Export", "Expected Result": "CSV downloads containing filtered student data.", "Status": "Manual", "Automation Script": "N/A"},

    # SUPER ADMIN MODULE
    {"Test Case ID": "TC_SAD_001", "Module": "Super Admin", "Scenario": "Manage Colleges", "Description": "Verify super admin can add a new college.", "Pre-conditions": "Super Admin on /dashboard/admin/colleges", "Steps": "1. Click Add College\n2. Fill form\n3. Save", "Expected Result": "College is created and added to platform.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_SAD_002", "Module": "Super Admin", "Scenario": "System Settings", "Description": "Verify super admin can toggle global features.", "Pre-conditions": "Super Admin on /dashboard/admin/settings", "Steps": "1. Toggle a setting\n2. Save", "Expected Result": "Global setting applies across tenant accounts.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_SAD_003", "Module": "Super Admin", "Scenario": "View Platform Metrics", "Description": "Verify super admin sees aggregated platform data.", "Pre-conditions": "Super Admin on overview", "Steps": "1. Check Total Users metric", "Expected Result": "Metric matches sum of all tenant users.", "Status": "Manual", "Automation Script": "N/A"},

    # CORE / SYSTEM
    {"Test Case ID": "TC_SYS_001", "Module": "System", "Scenario": "MEGA Sync Backup", "Description": "Verify automated backup manager correctly pushes to MEGA.", "Pre-conditions": "Backup script configured", "Steps": "1. Run mega_backup_manager.py", "Expected Result": "Incremental backup succeeds without redundant uploads.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_SYS_002", "Module": "System", "Scenario": "Email Outreach Deliverability", "Description": "Verify generic email prefixes are filtered out.", "Pre-conditions": "Campaign script configured", "Steps": "1. Run send_placement_campaigns.py", "Expected Result": "Emails sent only to firstname.lastname format; generic skipped.", "Status": "Manual", "Automation Script": "N/A"},
    {"Test Case ID": "TC_SYS_003", "Module": "System", "Scenario": "Data Import Validation", "Description": "Verify CSV imports reject malformed data.", "Pre-conditions": "Any CSV upload page", "Steps": "1. Upload CSV with missing columns", "Expected Result": "Validation error displayed. No corrupted data inserted.", "Status": "Manual", "Automation Script": "N/A"}
]

df = pd.DataFrame(test_cases)

# Create an Excel writer object
output_path = os.path.join("qa", "CampusPlacement_Test_Cases.xlsx")
writer = pd.ExcelWriter(output_path, engine='openpyxl')

# Write the dataframe to Excel
df.to_excel(writer, index=False, sheet_name='E2E Test Cases')

# Auto-adjust column widths
workbook = writer.book
worksheet = writer.sheets['E2E Test Cases']
for col in worksheet.columns:
    max_length = 0
    column = col[0].column_letter
    for cell in col:
        try:
            if len(str(cell.value)) > max_length:
                max_length = len(str(cell.value))
        except:
            pass
    adjusted_width = min(max_length + 2, 60)
    worksheet.column_dimensions[column].width = adjusted_width

# Save the workbook
writer.close()

print(f"Expanded Test cases Excel file generated at: {output_path}")
