/**
 * Hardcoded sample rows for static HTML mockups (not live data).
 * Matched by path keywords under each role.
 */
(function () {
  const status = (label, kind) => ({ __status: true, label, kind });

  const TABLES = {
    students: {
      columns: ['Name', 'Roll No', 'Branch', 'CGPA', 'Year', 'Status'],
      rows: [
        ['Sneha Rao', 'CS21B001', 'CSE', '8.72', '2026', status('Verified', 'success')],
        ['Arjun Patel', 'EC21B014', 'ECE', '8.10', '2026', status('Pending', 'warning')],
        ['Meera Iyer', 'CS21B032', 'CSE', '9.01', '2026', status('Verified', 'success')],
        ['Rohan Das', 'ME21B008', 'Mech', '7.85', '2026', status('Verified', 'success')],
        ['Kavya Nair', 'IT21B019', 'IT', '8.45', '2025', status('Pending', 'warning')],
        ['Vikram Shah', 'CS22B045', 'CSE', '8.90', '2027', status('Verified', 'success')],
      ],
    },
    drives: {
      columns: ['Company', 'Role', 'Package', 'Deadline', 'Applicants', 'Status'],
      rows: [
        ['TechCorp India', 'SDE Intern', '₹45,000/mo', '28 Jul 2026', '42', status('Open', 'success')],
        ['Infosys', 'Systems Engineer', '₹4.5 LPA', '02 Aug 2026', '118', status('Open', 'success')],
        ['Amazon', 'SDE-1', '₹28 LPA', '15 Jul 2026', '86', status('Closed', 'neutral')],
        ['TCS', 'Digital Cadet', '₹3.6 LPA', '10 Aug 2026', '210', status('Open', 'success')],
        ['Zoho', 'Member Technical Staff', '₹8.4 LPA', '22 Jul 2026', '55', status('Shortlisting', 'warning')],
      ],
    },
    applications: {
      columns: ['Applicant', 'Opportunity', 'Company', 'Applied', 'Stage', 'Status'],
      rows: [
        ['Sneha Rao', 'SDE Intern', 'TechCorp India', '12 Jul 2026', 'Interview', status('In progress', 'warning')],
        ['Arjun Patel', 'Systems Engineer', 'Infosys', '10 Jul 2026', 'Applied', status('Submitted', 'info')],
        ['Meera Iyer', 'SDE-1', 'Amazon', '05 Jul 2026', 'Offer', status('Selected', 'success')],
        ['Rohan Das', 'Digital Cadet', 'TCS', '14 Jul 2026', 'Assessment', status('In progress', 'warning')],
        ['Kavya Nair', 'MTS', 'Zoho', '08 Jul 2026', 'Rejected', status('Closed', 'danger')],
      ],
    },
    employers: {
      columns: ['Company', 'Contact', 'Industry', 'Partnerships', 'Status'],
      rows: [
        ['TechCorp India', 'rahul@techcorp.demo', 'Product / SaaS', '3 campuses', status('Active', 'success')],
        ['Infosys', 'campus@infosys.demo', 'IT Services', '5 campuses', status('Active', 'success')],
        ['Amazon', 'univ@amazon.demo', 'E-commerce', '2 campuses', status('Active', 'success')],
        ['Startup Labs', 'hello@startuplabs.demo', 'Startup', '1 campus', status('Pending', 'warning')],
        ['NovaBank', 'talent@novabank.demo', 'BFSI', '2 campuses', status('Active', 'success')],
      ],
    },
    offers: {
      columns: ['Student', 'Company', 'Role', 'Package', 'Issued', 'Status'],
      rows: [
        ['Meera Iyer', 'Amazon', 'SDE-1', '₹28 LPA', '18 Jul 2026', status('Accepted', 'success')],
        ['Sneha Rao', 'TechCorp India', 'SDE Intern', '₹45,000/mo', '16 Jul 2026', status('Pending', 'warning')],
        ['Vikram Shah', 'Zoho', 'MTS', '₹8.4 LPA', '12 Jul 2026', status('Accepted', 'success')],
        ['Arjun Patel', 'Infosys', 'Systems Engineer', '₹4.5 LPA', '11 Jul 2026', status('Declined', 'danger')],
      ],
    },
    internships: {
      columns: ['Title', 'Company', 'Duration', 'Stipend', 'Campus', 'Status'],
      rows: [
        ['Frontend Intern', 'TechCorp India', '3 months', '₹25,000', 'NIT (Demo)', status('Open', 'success')],
        ['Data Analyst Intern', 'NovaBank', '6 months', '₹30,000', 'NIT (Demo)', status('Open', 'success')],
        ['ML Intern', 'Amazon', '2 months', '₹50,000', 'IITM (Demo)', status('Filled', 'neutral')],
        ['QA Intern', 'Infosys', '3 months', '₹18,000', 'BITS (Demo)', status('Open', 'success')],
      ],
    },
    projects: {
      columns: ['Project', 'Sponsor', 'Skills', 'Seats', 'Deadline', 'Status'],
      rows: [
        ['Campus Chatbot', 'TechCorp India', 'React, Node', '4', '30 Jul 2026', status('Open', 'success')],
        ['Placement Analytics', 'NovaBank', 'Python, SQL', '3', '05 Aug 2026', status('Open', 'success')],
        ['Resume Parser', 'Infosys', 'NLP, Python', '2', '20 Jul 2026', status('Review', 'warning')],
      ],
    },
    hackathons: {
      columns: ['Event', 'Organizer', 'Dates', 'Teams', 'Prize', 'Status'],
      rows: [
        ['CodeSprint 2026', 'TechCorp India', '1–2 Aug', '48', '₹1 Lakh', status('Open', 'success')],
        ['FinTech Hack', 'NovaBank', '15–16 Aug', '32', '₹75,000', status('Open', 'success')],
        ['AI for Campus', 'College', '10 Jul', '60', '₹50,000', status('Completed', 'neutral')],
      ],
    },
    interviews: {
      columns: ['Candidate', 'Company', 'Round', 'When', 'Mode', 'Status'],
      rows: [
        ['Sneha Rao', 'TechCorp India', 'Technical 1', '22 Jul, 10:00', 'Online', status('Scheduled', 'info')],
        ['Rohan Das', 'TCS', 'HR', '23 Jul, 14:30', 'Campus', status('Scheduled', 'info')],
        ['Meera Iyer', 'Amazon', 'Bar raiser', '20 Jul, 11:00', 'Online', status('Completed', 'success')],
        ['Arjun Patel', 'Infosys', 'Technical', '19 Jul, 16:00', 'Online', status('No-show', 'danger')],
      ],
    },
    alerts: {
      columns: ['Title', 'Audience', 'Channel', 'Sent', 'Status'],
      rows: [
        ['Drive deadline tomorrow — TechCorp', 'Students (CSE)', 'In-app + Email', '19 Jul 2026', status('Sent', 'success')],
        ['New internship posted', 'All students', 'In-app', '18 Jul 2026', status('Sent', 'success')],
        ['Partnership request pending', 'College admin', 'In-app', '17 Jul 2026', status('Unread', 'warning')],
        ['Offer acceptance reminder', 'Meera Iyer', 'Email', '16 Jul 2026', status('Sent', 'success')],
      ],
    },
    feedback: {
      columns: ['From', 'Role', 'Subject', 'Submitted', 'Status'],
      rows: [
        ['Sneha Rao', 'Student', 'Interview scheduling unclear', '18 Jul 2026', status('Open', 'warning')],
        ['Rahul Mehta', 'Employer', 'Export CSV missing columns', '17 Jul 2026', status('In review', 'info')],
        ['Priya Sharma', 'College Admin', 'Feature idea: bulk verify', '15 Jul 2026', status('Closed', 'success')],
      ],
    },
    clarifications: {
      columns: ['Raised by', 'Topic', 'Related to', 'Updated', 'Status'],
      rows: [
        ['Sneha Rao', 'Eligibility CGPA', 'TechCorp SDE Intern', '19 Jul', status('Answered', 'success')],
        ['Arjun Patel', 'Bond period', 'Infosys SE', '18 Jul', status('Open', 'warning')],
        ['College Admin', 'JD attachment', 'Amazon SDE-1', '17 Jul', status('Answered', 'success')],
      ],
    },
    discussions: {
      columns: ['Thread', 'Participants', 'Last message', 'Unread', 'Status'],
      rows: [
        ['Campus visit logistics — TechCorp', 'College, Employer', '19 Jul 09:12', '2', status('Active', 'success')],
        ['Internship PPO process', 'College, Employer', '18 Jul 16:40', '0', status('Active', 'success')],
        ['Assessment window extension', 'Employer, Student', '15 Jul 11:05', '1', status('Waiting', 'warning')],
      ],
    },
    calendar: {
      columns: ['Event', 'Type', 'Date', 'Time', 'Location', 'Status'],
      rows: [
        ['TechCorp PPT', 'Drive', '22 Jul 2026', '10:00–11:00', 'Seminar Hall A', status('Confirmed', 'success')],
        ['Infosys Assessment', 'Test', '24 Jul 2026', '09:00–11:00', 'Lab Block', status('Confirmed', 'success')],
        ['Amazon Interviews', 'Interview', '25 Jul 2026', 'Full day', 'Online', status('Tentative', 'warning')],
        ['Guest lecture — AI careers', 'Event', '28 Jul 2026', '15:00–16:30', 'Auditorium', status('Confirmed', 'success')],
      ],
    },
    events: {
      columns: ['Event', 'Organizer', 'Date', 'Venue', 'RSVPs', 'Status'],
      rows: [
        ['Industry Connect Day', 'Placement Cell', '28 Jul 2026', 'Auditorium', '186', status('Open', 'success')],
        ['Resume Workshop', 'Career Services', '30 Jul 2026', 'Hall B', '94', status('Open', 'success')],
        ['Alumni Talk', 'Alumni Office', '05 Aug 2026', 'Online', '120', status('Scheduled', 'info')],
      ],
    },
    marketplace: {
      columns: ['Listing', 'Type', 'Posted by', 'Campus reach', 'Posted', 'Status'],
      rows: [
        ['Campus hiring — SDE roles', 'Drive interest', 'TechCorp India', '12 colleges', '14 Jul', status('Live', 'success')],
        ['Internship cohort Q3', 'Internship', 'NovaBank', '8 colleges', '12 Jul', status('Live', 'success')],
        ['Guest faculty — Product Mgmt', 'Engagement', 'Startup Labs', '5 colleges', '10 Jul', status('Draft', 'neutral')],
      ],
    },
    sponsorships: {
      columns: ['Sponsor', 'Program', 'Amount', 'Academic year', 'Status'],
      rows: [
        ['TechCorp India', 'Hackathon title', '₹2,00,000', '2025-26', status('Approved', 'success')],
        ['NovaBank', 'Lab equipment', '₹5,00,000', '2025-26', status('Pending', 'warning')],
        ['Infosys', 'Guest series', '₹1,50,000', '2025-26', status('Approved', 'success')],
      ],
    },
    reports: {
      columns: ['Report', 'Scope', 'Generated', 'Rows', 'Format'],
      rows: [
        ['Placement summary', '2025-26', '19 Jul 2026', '312', 'XLSX'],
        ['Drive-wise applications', 'CSE / ECE', '18 Jul 2026', '1,204', 'CSV'],
        ['Offer acceptance funnel', 'All branches', '16 Jul 2026', '88', 'PDF'],
        ['Internship completion', 'Q2', '12 Jul 2026', '64', 'XLSX'],
      ],
    },
    users: {
      columns: ['Name', 'Email', 'Role', 'Tenant', 'Last login', 'Status'],
      rows: [
        ['Platform Admin', 'admin@placementhub.demo', 'Super Admin', 'Platform', '20 Jul 2026', status('Active', 'success')],
        ['Priya Sharma', 'priya@nit.demo', 'College Admin', 'NIT (Demo)', '19 Jul 2026', status('Active', 'success')],
        ['Rahul Mehta', 'rahul@techcorp.demo', 'Employer', 'TechCorp', '19 Jul 2026', status('Active', 'success')],
        ['Alex Kumar', 'alex@student.demo', 'Student', 'NIT (Demo)', '18 Jul 2026', status('Active', 'success')],
        ['Ananya Reddy', 'ananya@nit.demo', 'Placement Committee', 'NIT (Demo)', '17 Jul 2026', status('Active', 'success')],
      ],
    },
    colleges: {
      columns: ['College', 'Slug', 'Students', 'Employers', 'Drives', 'Status'],
      rows: [
        ['National Institute of Technology (Demo)', 'nit-demo', '1,240', '28', '14', status('Active', 'success')],
        ['IIT Madras (Demo)', 'iitm-demo', '980', '35', '22', status('Active', 'success')],
        ['BITS Pilani (Demo)', 'bits-demo', '1,100', '30', '18', status('Active', 'success')],
        ['VIT (Demo)', 'vit-demo', '2,400', '40', '25', status('Active', 'success')],
      ],
    },
    assessments: {
      columns: ['Drive / Job', 'Round', 'Candidates', 'Uploaded', 'Updated', 'Status'],
      rows: [
        ['TechCorp SDE Intern', 'Online test', '42', '18 Jul', '19 Jul', status('Complete', 'success')],
        ['Infosys SE', 'Aptitude', '118', '17 Jul', '17 Jul', status('Partial', 'warning')],
        ['Amazon SDE-1', 'OA', '86', '15 Jul', '16 Jul', status('Complete', 'success')],
        ['Zoho MTS', 'Written', '55', '—', '—', status('Pending', 'neutral')],
      ],
    },
    templates: {
      columns: ['Template', 'Type', 'Last edited', 'Used', 'Status'],
      rows: [
        ['Offer — Full time', 'Offer letter', '12 Jul 2026', '24', status('Active', 'success')],
        ['Interview invite', 'Email', '10 Jul 2026', '61', status('Active', 'success')],
        ['Drive announcement', 'Bulk notify', '08 Jul 2026', '15', status('Active', 'success')],
        ['Rejection soft', 'Email', '05 Jul 2026', '40', status('Draft', 'neutral')],
      ],
    },
    mentorship: {
      columns: ['Student', 'Topic', 'Preferred company', 'Requested', 'Status'],
      rows: [
        ['Sneha Rao', 'Resume review', 'TechCorp India', '18 Jul', status('Open', 'warning')],
        ['Arjun Patel', 'Interview prep', 'Amazon', '17 Jul', status('Matched', 'success')],
        ['Kavya Nair', 'Career path — Product', 'Any', '15 Jul', status('Open', 'warning')],
      ],
    },
    documents: {
      columns: ['Document', 'Category', 'Uploaded', 'Size', 'Status'],
      rows: [
        ['Alex_Kumar_CV.pdf', 'Resume', '18 Jul 2026', '240 KB', status('Verified', 'success')],
        ['Marksheet_Sem6.pdf', 'Academic', '10 Jul 2026', '1.2 MB', status('Uploaded', 'info')],
        ['ID_Proof.pdf', 'Identity', '02 Jul 2026', '420 KB', status('Uploaded', 'info')],
      ],
    },
    exports: {
      columns: ['Export', 'Requested', 'Rows', 'Ready', 'Status'],
      rows: [
        ['My applications', '19 Jul 2026', '12', '19 Jul 10:02', status('Ready', 'success')],
        ['Profile snapshot', '15 Jul 2026', '1', '15 Jul 14:20', status('Ready', 'success')],
        ['Alerts history', '12 Jul 2026', '48', '12 Jul 09:11', status('Expired', 'neutral')],
      ],
    },
    partnerships: {
      columns: ['Employer', 'Requested', 'Campus', 'Scope', 'Status'],
      rows: [
        ['TechCorp India', '01 Jun 2026', 'NIT (Demo)', 'Drives + Internships', status('Approved', 'success')],
        ['Startup Labs', '10 Jul 2026', 'NIT (Demo)', 'Internships', status('Pending', 'warning')],
        ['NovaBank', '05 May 2026', 'NIT (Demo)', 'Full recruiting', status('Approved', 'success')],
      ],
    },
    alumniJobs: {
      columns: ['Role', 'Company', 'Location', 'Experience', 'Posted', 'Status'],
      rows: [
        ['Senior SDE', 'TechCorp India', 'Bengaluru', '3–5 yrs', '18 Jul', status('Open', 'success')],
        ['Product Analyst', 'NovaBank', 'Mumbai', '2–4 yrs', '16 Jul', status('Open', 'success')],
        ['DevOps Engineer', 'Infosys', 'Hyderabad', '4–6 yrs', '12 Jul', status('Closed', 'neutral')],
      ],
    },
    pendingRegistrations: {
      columns: ['Organization', 'Type', 'Contact', 'Submitted', 'Status'],
      rows: [
        ['GreenTech Pvt Ltd', 'Employer', 'hr@greentech.demo', '19 Jul', status('Pending', 'warning')],
        ['City Engineering College', 'College', 'tpo@cityeng.demo', '18 Jul', status('Pending', 'warning')],
        ['PixelWorks', 'Employer', 'jobs@pixel.demo', '15 Jul', status('Approved', 'success')],
      ],
    },
    errorLogs: {
      columns: ['Severity', 'Functionality', 'Route', 'User'],
      rows: [
        [status('ERROR', 'danger'), 'College — student CV list', 'GET /api/college/students/…/cvs', 'Rajesh Kumar'],
        [status('ERROR', 'danger'), 'College — student CV list', 'GET /api/college/students/…/cvs', 'Priya Sharma'],
        [status('INFO', 'neutral'), 'Notifications', 'POST /api/notifications', 'System'],
        [status('INFO', 'neutral'), 'Notifications', 'GET /api/notifications', 'Alex Kumar'],
        [status('ERROR', 'danger'), 'Employer — applications', 'GET /api/employer/applications', 'Rahul Mehta'],
        [status('WARN', 'warning'), 'Student — profile', 'PATCH /api/student/profile', 'Sneha Rao'],
      ],
      details: [
        {
          shortId: '95818415',
          fullId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          timestamp: '20 Jul 2026, 7:05:09 pm',
          severity: 'error',
          functionality: 'College — student CV list',
          functionalityKey: 'api_college_student_cv_list',
          httpStatus: '500',
          user: 'Rajesh Kumar',
          email: 'admin@iitm.edu',
          campus: 'Indian Institute of Technology, Madras (Demo)',
          ip: '122.167.112.111',
          route: 'GET /api/college/students/d1000000-…/cvs',
          source: 'cv_soft_failure',
        },
        {
          shortId: '95818416',
          fullId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          timestamp: '20 Jul 2026, 6:42:11 pm',
          severity: 'error',
          functionality: 'College — student CV list',
          functionalityKey: 'api_college_student_cv_list',
          httpStatus: '500',
          user: 'Priya Sharma',
          email: 'priya@nit.demo',
          campus: 'National Institute of Technology (Demo)',
          ip: '103.24.88.12',
          route: 'GET /api/college/students/…/cvs',
          source: 'cv_soft_failure',
        },
        {
          shortId: '95818301',
          fullId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
          timestamp: '20 Jul 2026, 5:10:00 pm',
          severity: 'info',
          functionality: 'Notifications',
          functionalityKey: 'api_notifications',
          httpStatus: '200',
          user: 'System',
          email: '—',
          campus: '—',
          ip: '10.0.0.1',
          route: 'POST /api/notifications',
          source: 'scheduler',
        },
        {
          shortId: '95818302',
          fullId: 'd4e5f6a7-b8c9-0123-def0-234567890123',
          timestamp: '20 Jul 2026, 4:55:22 pm',
          severity: 'info',
          functionality: 'Notifications',
          functionalityKey: 'api_notifications',
          httpStatus: '200',
          user: 'Alex Kumar',
          email: 'alex@student.demo',
          campus: 'NIT (Demo)',
          ip: '49.36.10.8',
          route: 'GET /api/notifications',
          source: 'client_poll',
        },
        {
          shortId: '95818250',
          fullId: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
          timestamp: '19 Jul 2026, 10:14:03 pm',
          severity: 'error',
          functionality: 'Employer — applications',
          functionalityKey: 'api_employer_applications',
          httpStatus: '500',
          user: 'Rahul Mehta',
          email: 'rahul@techcorp.demo',
          campus: 'TechCorp India (Demo)',
          ip: '52.66.120.4',
          route: 'GET /api/employer/applications',
          source: 'db_timeout',
        },
        {
          shortId: '95818210',
          fullId: 'f6a7b8c9-d0e1-2345-f012-456789012345',
          timestamp: '19 Jul 2026, 6:02:44 pm',
          severity: 'warn',
          functionality: 'Student — profile',
          functionalityKey: 'api_student_profile',
          httpStatus: '400',
          user: 'Sneha Rao',
          email: 'sneha@student.demo',
          campus: 'NIT (Demo)',
          ip: '122.167.112.90',
          route: 'PATCH /api/student/profile',
          source: 'validation',
        },
      ],
    },
    emailLogs: {
      columns: ['To', 'Template', 'Context', 'Sent', 'Status'],
      rows: [
        ['sneha@student.demo', 'Interview invite', 'TechCorp T1', '19 Jul 09:00', status('Delivered', 'success')],
        ['rahul@techcorp.demo', 'Partnership approved', 'NIT (Demo)', '18 Jul 16:22', status('Delivered', 'success')],
        ['alex@student.demo', 'Offer reminder', 'Amazon SDE-1', '17 Jul 10:05', status('Bounced', 'danger')],
      ],
    },
    settings: {
      columns: ['Setting', 'Value', 'Scope', 'Updated'],
      rows: [
        ['Academic year', '2025-26', 'College', '01 Jun 2026'],
        ['Require CV verification', 'Off', 'College', '12 Jul 2026'],
        ['Default offer window', '7 days', 'Employer', '08 Jul 2026'],
        ['Theme', 'System', 'User', '20 Jul 2026'],
      ],
    },
    overview: {
      columns: ['Metric', 'This week', 'This month', 'Trend'],
      rows: [
        ['Active drives', '6', '14', '↑'],
        ['New applications', '48', '210', '↑'],
        ['Interviews scheduled', '12', '39', '→'],
        ['Offers issued', '4', '18', '↑'],
        ['Open clarifications', '3', '11', '↓'],
      ],
    },
    generic: {
      columns: ['Item', 'Owner', 'Updated', 'Priority', 'Status'],
      rows: [
        ['Sample record A', 'PlacementHub', '19 Jul 2026', 'Normal', status('Active', 'success')],
        ['Sample record B', 'PlacementHub', '18 Jul 2026', 'High', status('Pending', 'warning')],
        ['Sample record C', 'PlacementHub', '17 Jul 2026', 'Normal', status('Active', 'success')],
        ['Sample record D', 'PlacementHub', '15 Jul 2026', 'Low', status('Closed', 'neutral')],
        ['Sample record E', 'PlacementHub', '12 Jul 2026', 'Normal', status('Active', 'success')],
      ],
    },
  };

  /** First matching keyword wins (order matters — more specific first). */
  const RULES = [
    [/\/students/, 'students'],
    [/\/archived-students/, 'students'],
    [/\/employers\/requests|select-campus|partnership/, 'partnerships'],
    [/\/employers/, 'employers'],
    [/\/colleges/, 'colleges'],
    [/\/pending-registrations/, 'pendingRegistrations'],
    [/\/applications/, 'applications'],
    [/\/offers/, 'offers'],
    [/\/drives|placement-listings/, 'drives'],
    [/\/internships/, 'internships'],
    [/\/projects/, 'projects'],
    [/\/hackathons/, 'hackathons'],
    [/\/interviews/, 'interviews'],
    [/\/alerts|bulk-notifications|notifications/, 'alerts'],
    [/\/feedback/, 'feedback'],
    [/\/clarifications/, 'clarifications'],
    [/\/discussions/, 'discussions'],
    [/\/calendar|events|guest-engagements|campus-guest/, 'calendar'],
    [/\/marketplace/, 'marketplace'],
    [/\/sponsorships|startup-funding/, 'sponsorships'],
    [/\/reports|audit-reports|overview/, 'reports'],
    [/\/users/, 'users'],
    [/\/assessment|hiring-assessment|fcfs/, 'assessments'],
    [/\/template|communication-templates|message-templates|email-templates|offer-templates/, 'templates'],
    [/\/mentorship/, 'mentorship'],
    [/\/documents|my-cvs/, 'documents'],
    [/\/my-exports|data-export/, 'exports'],
    [/\/alumni|\/jobs$/, 'alumniJobs'],
    [/\/error-logs/, 'errorLogs'],
    [/\/email-logs/, 'emailLogs'],
    [/\/settings|enrollment-key|rules|academic-years|infrastructure|profile|getting-started/, 'settings'],
    [/\/feature-ideas/, 'feedback'],
  ];

  function resolveTableKey(href) {
    const path = String(href || '');
    for (const [re, key] of RULES) {
      if (re.test(path)) return key;
    }
    if (/\/overview$/.test(path)) return 'overview';
    return 'generic';
  }

  /** Hub widgets: action required + recent activity (per role mockup key). */
  const HUB_FEEDS = {
    student: {
      actions: [
        {
          title: 'Respond to TechCorp interview invite',
          detail: 'Technical round · 22 Jul, 10:00',
          href: '/dashboard/student/interviews',
          tone: 'warning',
          icon: 'calendar',
        },
        {
          title: 'Accept or decline Amazon offer',
          detail: 'SDE-1 · expires in 3 days',
          href: '/dashboard/student/offers',
          tone: 'danger',
          icon: 'handshake',
        },
        {
          title: 'Upload verified CV for Zoho drive',
          detail: 'Required before apply closes 22 Jul',
          href: '/dashboard/student/my-cvs',
          tone: 'warning',
          icon: 'file-pen',
        },
      ],
      activity: [
        {
          title: 'Infosys marked your application In progress',
          detail: 'Systems Engineer · 2h ago',
          href: '/dashboard/student/applications/drives',
          icon: 'clipboard-list',
        },
        {
          title: 'New drive: TCS Digital Cadet',
          detail: 'Deadline 10 Aug · 5h ago',
          href: '/dashboard/student/drives',
          icon: 'target',
        },
        {
          title: 'Clarification answered — CGPA eligibility',
          detail: 'TechCorp SDE Intern · Yesterday',
          href: '/dashboard/student/clarifications',
          icon: 'circle-help',
        },
        {
          title: 'Mentor Connect request matched',
          detail: 'Interview prep · Yesterday',
          href: '/dashboard/student/mentorship-requests',
          icon: 'hand-heart',
        },
      ],
    },
    college: {
      actions: [
        {
          title: 'Review 2 employer partnership requests',
          detail: 'Startup Labs, PixelWorks',
          href: '/dashboard/college/employers/requests',
          tone: 'warning',
          icon: 'inbox',
        },
        {
          title: 'Verify 5 student profiles',
          detail: 'Pending Verified badge',
          href: '/dashboard/college/students',
          tone: 'warning',
          icon: 'users',
        },
        {
          title: 'Approve TechCorp drive for campus',
          detail: 'SDE Intern · requested today',
          href: '/dashboard/college/drives',
          tone: 'danger',
          icon: 'target',
        },
      ],
      activity: [
        {
          title: 'Amazon issued 3 offers',
          detail: 'SDE-1 · 1h ago',
          href: '/dashboard/college/offers',
          icon: 'send',
        },
        {
          title: 'Bulk notification delivered',
          detail: 'Drive deadline reminder · 3h ago',
          href: '/dashboard/college/bulk-notifications',
          icon: 'megaphone',
        },
        {
          title: 'New clarification from student',
          detail: 'Bond period — Infosys · Yesterday',
          href: '/dashboard/college/clarifications',
          icon: 'circle-help',
        },
        {
          title: 'Internship PPO submitted',
          detail: 'NovaBank · Yesterday',
          href: '/dashboard/college/internship-ppo',
          icon: 'award',
        },
      ],
    },
    employer: {
      actions: [
        {
          title: 'Shortlist applications for SDE Intern',
          detail: '42 applicants · TechCorp drive',
          href: '/dashboard/employer/applications',
          tone: 'warning',
          icon: 'clipboard-list',
        },
        {
          title: 'Upload assessment results (CSV)',
          detail: 'Infosys tie-up campus · overdue',
          href: '/dashboard/employer/assessment-uploads',
          tone: 'danger',
          icon: 'file-text',
        },
        {
          title: 'Confirm interview slots — 4 pending',
          detail: 'Round: Technical 1',
          href: '/dashboard/employer/interviews',
          tone: 'warning',
          icon: 'calendar',
        },
      ],
      activity: [
        {
          title: 'NIT approved campus partnership',
          detail: 'Full recruiting · 2h ago',
          href: '/dashboard/employer/select-campus',
          icon: 'handshake',
        },
        {
          title: '12 new applications received',
          detail: 'SDE Intern · 4h ago',
          href: '/dashboard/employer/applications',
          icon: 'inbox',
        },
        {
          title: 'Student accepted offer',
          detail: 'Meera Iyer · Yesterday',
          href: '/dashboard/employer/offers',
          icon: 'send',
        },
        {
          title: 'Clarification posted by college',
          detail: 'JD attachment · Yesterday',
          href: '/dashboard/employer/clarifications',
          icon: 'circle-help',
        },
      ],
    },
    'placement-committee': {
      actions: [
        {
          title: 'Review unverified student profiles',
          detail: '5 students awaiting Verified mark',
          href: '/dashboard/college/students',
          tone: 'warning',
          icon: 'users',
        },
        {
          title: 'Check stalled applications',
          detail: '8 in Assessment > 7 days',
          href: '/dashboard/college/applications',
          tone: 'warning',
          icon: 'clipboard-list',
        },
      ],
      activity: [
        {
          title: 'College admin verified 3 profiles',
          detail: 'CSE batch · 1h ago',
          href: '/dashboard/college/students',
          icon: 'users',
        },
        {
          title: 'New applications on TechCorp drive',
          detail: '14 today · 3h ago',
          href: '/dashboard/college/applications',
          icon: 'target',
        },
        {
          title: 'Feedback submitted by employer',
          detail: 'Export CSV columns · Yesterday',
          href: '/dashboard/feedback',
          icon: 'message-square',
        },
      ],
    },
    'super-admin': {
      actions: [
        {
          title: 'Onboard pending registrations',
          detail: '2 employers · 1 college',
          href: '/dashboard/admin/pending-registrations',
          tone: 'warning',
          icon: 'inbox',
        },
        {
          title: 'Triage feedback inbox',
          detail: '4 open tickets',
          href: '/dashboard/admin/feedback',
          tone: 'warning',
          icon: 'inbox',
        },
        {
          title: 'Investigate error spike',
          detail: '/api/employer/applications · 3× 500',
          href: '/dashboard/admin/error-logs',
          tone: 'danger',
          icon: 'triangle-alert',
        },
      ],
      activity: [
        {
          title: 'New college activated',
          detail: 'City Engineering College · 2h ago',
          href: '/dashboard/admin/colleges',
          icon: 'building',
        },
        {
          title: 'Marketplace listing published',
          detail: 'Campus hiring — SDE roles · 5h ago',
          href: '/dashboard/admin/marketplace',
          icon: 'store',
        },
        {
          title: 'Email bounce rate elevated',
          detail: 'Offer reminders · Yesterday',
          href: '/dashboard/admin/email-logs',
          icon: 'mail',
        },
        {
          title: 'User role updated',
          detail: 'Placement Committee · NIT · Yesterday',
          href: '/dashboard/admin/users',
          icon: 'users',
        },
      ],
    },
  };

  window.PLACEMENTHUB_MOCKUP_TABLES = TABLES;
  window.PLACEMENTHUB_MOCKUP_resolveTable = resolveTableKey;
  window.PLACEMENTHUB_MOCKUP_HUB_FEEDS = HUB_FEEDS;

  /**
   * Row action icons (lucide names) matching StandardTableIconAction verbs in the live app.
   * variant: secondary | danger | success | primary
   */
  const ROW_ACTIONS = {
    students: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'approve', icon: 'badge-check', label: 'Mark verified', variant: 'success' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Download CV', 'Send email', 'Archive'] },
    ],
    drives: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'pipeline', icon: 'git-branch', label: 'View pipeline', variant: 'secondary' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Duplicate', 'Close drive', 'Delete'] },
    ],
    applications: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'shortlist', icon: 'list-plus', label: 'Shortlist', variant: 'primary' },
      { action: 'reject', icon: 'x-circle', label: 'Reject', variant: 'danger' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Open CV', 'Send email', 'Move stage'] },
    ],
    employers: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'pocs', icon: 'users', label: 'Manage contacts', variant: 'secondary' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Request tie-up', 'Archive'] },
    ],
    offers: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'download', icon: 'download', label: 'Download', variant: 'secondary' },
      { action: 'confirm', icon: 'send', label: 'Send confirmation', variant: 'primary' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Edit', 'Withdraw'] },
    ],
    internships: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
    ],
    interviews: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'email', icon: 'mail', label: 'Email', variant: 'secondary' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Reschedule', 'Cancel'] },
    ],
    alerts: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'details', icon: 'file-text', label: 'Details', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
    ],
    documents: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'download', icon: 'download', label: 'Download', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
    ],
    errorLogs: [
      { action: 'view', icon: 'eye', label: 'View details', variant: 'secondary' },
      { action: 'download', icon: 'download', label: 'Copy / export', variant: 'secondary' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Mark reviewed', 'Open route'] },
    ],
    emailLogs: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'download', icon: 'download', label: 'Download', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
    ],
    partnerships: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'approve', icon: 'check-circle', label: 'Approve', variant: 'success' },
      { action: 'reject', icon: 'x-circle', label: 'Reject', variant: 'danger' },
    ],
    pendingRegistrations: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'approve', icon: 'check-circle', label: 'Approve', variant: 'success' },
      { action: 'reject', icon: 'x-circle', label: 'Reject', variant: 'danger' },
    ],
    assessments: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'download', icon: 'download', label: 'Download', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Update', variant: 'secondary' },
    ],
    feedback: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'review', icon: 'clipboard-check', label: 'Review', variant: 'primary' },
      { action: 'close', icon: 'x', label: 'Close', variant: 'ghost' },
    ],
    users: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
    ],
    colleges: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'manage', icon: 'settings', label: 'Manage', variant: 'secondary' },
    ],
    generic: [
      { action: 'view', icon: 'eye', label: 'View', variant: 'secondary' },
      { action: 'edit', icon: 'pencil', label: 'Edit', variant: 'secondary' },
      { action: 'delete', icon: 'trash-2', label: 'Delete', variant: 'danger' },
      { action: 'more', icon: 'ellipsis', label: 'More actions', variant: 'ghost', menu: ['Duplicate', 'Archive'] },
    ],
  };

  const BULK_ACTIONS = {
    students: [
      { label: 'Verify selected', variant: 'success', icon: 'badge-check' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
      { label: 'Notify selected', variant: 'secondary', icon: 'mail' },
    ],
    applications: [
      { label: 'Shortlist selected', variant: 'primary', icon: 'list-plus' },
      { label: 'Reject selected', variant: 'danger', icon: 'x-circle' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
    ],
    partnerships: [
      { label: 'Approve selected', variant: 'success', icon: 'check-circle' },
      { label: 'Reject selected', variant: 'danger', icon: 'x-circle' },
    ],
    pendingRegistrations: [
      { label: 'Approve selected', variant: 'success', icon: 'check-circle' },
      { label: 'Reject selected', variant: 'danger', icon: 'x-circle' },
    ],
    offers: [
      { label: 'Send reminders', variant: 'primary', icon: 'send' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
    ],
    drives: [
      { label: 'Close selected', variant: 'secondary', icon: 'x' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
    ],
    errorLogs: [
      { label: 'Mark reviewed', variant: 'secondary', icon: 'check-circle' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
      { label: 'Delete selected', variant: 'danger', icon: 'trash-2' },
    ],
    alerts: [
      { label: 'Mark read', variant: 'secondary', icon: 'check-circle' },
      { label: 'Delete selected', variant: 'danger', icon: 'trash-2' },
    ],
    generic: [
      { label: 'Approve selected', variant: 'success', icon: 'check-circle' },
      { label: 'Export selected', variant: 'secondary', icon: 'download' },
      { label: 'Delete selected', variant: 'danger', icon: 'trash-2' },
    ],
  };

  function resolveRowActions(tableKey) {
    return ROW_ACTIONS[tableKey] || ROW_ACTIONS.generic;
  }

  function resolveBulkActions(tableKey) {
    return BULK_ACTIONS[tableKey] || BULK_ACTIONS.generic;
  }

  window.PLACEMENTHUB_MOCKUP_resolveRowActions = resolveRowActions;
  window.PLACEMENTHUB_MOCKUP_resolveBulkActions = resolveBulkActions;

  const EMPTY_STATES = {
    drives: {
      icon: 'target',
      title: 'You have no active drives',
      description: 'Create a placement drive to start collecting applications from students on your campuses.',
      cta: 'Create your first Drive',
    },
    students: {
      icon: 'users',
      title: 'No students in this view',
      description: 'Import a CSV or add students individually to build your placement roster for this academic year.',
      cta: 'Add Student',
    },
    applications: {
      icon: 'clipboard-list',
      title: 'No applications yet',
      description: 'When students apply to drives or internships, their applications will appear here for review.',
      cta: 'Browse open drives',
    },
    employers: {
      icon: 'building-2',
      title: 'No employers linked',
      description: 'Invite employers or approve partnership requests to unlock campus recruiting.',
      cta: 'Invite employer',
    },
    offers: {
      icon: 'send',
      title: 'No offers issued',
      description: 'Once candidates clear selection, issue offers from the pipeline or offers screen.',
      cta: 'Go to applications',
    },
    internships: {
      icon: 'graduation-cap',
      title: 'No internships posted',
      description: 'Post an internship opportunity so eligible students can apply and track progress.',
      cta: 'Create internship',
    },
    interviews: {
      icon: 'calendar',
      title: 'No interviews scheduled',
      description: 'Schedule interview slots for shortlisted candidates to keep the pipeline moving.',
      cta: 'Schedule interview',
    },
    alerts: {
      icon: 'bell',
      title: 'Inbox is clear',
      description: 'You are all caught up. New alerts from drives, offers, and partnerships will show up here.',
      cta: 'View all notifications',
    },
    errorLogs: {
      icon: 'triangle-alert',
      title: 'No error logs for this filter',
      description: 'Try widening the date range or clearing severity and functionality filters.',
      cta: 'Clear filters',
    },
    generic: {
      icon: 'inbox',
      title: 'Nothing here yet',
      description: 'When records are available for this screen, they will be listed in this table.',
      cta: 'Get started',
    },
  };

  function resolveEmptyState(tableKey) {
    return EMPTY_STATES[tableKey] || EMPTY_STATES.generic;
  }

  window.PLACEMENTHUB_MOCKUP_resolveEmptyState = resolveEmptyState;

  /**
   * Nested breadcrumb segments after the list page, when drilling into a row (View).
   * Mirrors deep routes like: Drives / 2026 TechCorp / Applicants / Alex Kumar
   */
  function buildNestedDetailCrumbs(tableKey, row, pageTitle) {
    const cell = (i) => {
      const v = row?.[i];
      if (v && typeof v === 'object' && v.__status) return v.label;
      return v != null ? String(v) : '';
    };
    const primary = cell(0) || 'Record';

    switch (tableKey) {
      case 'drives':
        return [
          { label: `${cell(0) || 'Drive'} (${cell(1) || 'Role'})` },
          { label: 'Applicants', hrefHint: 'applications' },
          { label: 'Alex Kumar' },
        ];
      case 'applications':
        return [
          { label: cell(2) || 'Company' },
          { label: cell(1) || 'Opportunity' },
          { label: cell(0) || 'Applicant' },
        ];
      case 'students':
        return [{ label: primary }];
      case 'offers':
        return [
          { label: cell(1) || 'Company' },
          { label: cell(0) || 'Student' },
        ];
      case 'internships':
        return [
          { label: cell(1) || 'Company' },
          { label: cell(0) || 'Internship' },
        ];
      case 'interviews':
        return [
          { label: cell(1) || 'Company' },
          { label: cell(0) || 'Candidate' },
        ];
      case 'employers':
      case 'colleges':
      case 'users':
        return [{ label: primary }];
      case 'partnerships':
      case 'pendingRegistrations':
        return [{ label: primary }];
      case 'assessments':
        return [
          { label: cell(0) || 'Assessment' },
          { label: cell(1) || 'Round' },
        ];
      case 'documents':
        return [{ label: primary }];
      case 'errorLogs':
        return [{ label: `Log ${cell(3) || primary}` }];
      case 'alerts':
      case 'feedback':
        return [{ label: primary }];
      default:
        return [{ label: primary || pageTitle }];
    }
  }

  window.PLACEMENTHUB_MOCKUP_buildNestedDetailCrumbs = buildNestedDetailCrumbs;
})();
