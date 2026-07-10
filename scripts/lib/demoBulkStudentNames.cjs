/** Realistic demo names for IITM-BULK-* roster rows. */

const FIRST_NAMES = [
  'Arjun', 'Priya', 'Karthik', 'Ananya', 'Rohan', 'Meera', 'Aditya', 'Kavya', 'Vikram', 'Divya',
  'Sanjay', 'Lakshmi', 'Suresh', 'Nandini', 'Rajesh', 'Pooja', 'Arun', 'Shruti', 'Mohan', 'Deepa',
  'Ganesh', 'Revathi', 'Harish', 'Swetha', 'Pranav', 'Ishita', 'Nikhil', 'Aishwarya', 'Varun', 'Keerthi',
  'Rahul', 'Neha', 'Amit', 'Sneha', 'Vivek', 'Anjali', 'Manoj', 'Preeti', 'Ashok', 'Ritu',
  'Kiran', 'Tulsi', 'Devan', 'Yamini', 'Senthil', 'Malini', 'Gopal', 'Harini', 'Bijoy', 'Lata',
];

const LAST_NAMES = [
  'Verma', 'Sharma', 'Reddy', 'Iyer', 'Patel', 'Nair', 'Gupta', 'Rao', 'Singh', 'Krishnan',
  'Menon', 'Joshi', 'Desai', 'Mukherjee', 'Banerjee', 'Choudhury', 'Pillai', 'Hegde', 'Bhat', 'Chauhan',
  'Kapoor', 'Saxena', 'Agarwal', 'Malhotra', 'Khanna', 'Subramanian', 'Venkatesh', 'Ramachandran', 'Sundaram', 'Narayanan',
  'Gopalakrishnan', 'Balasubramanian', 'Srinivasan', 'Ranganathan', 'Mahadevan', 'Chandrasekhar', 'Thakur', 'Mishra', 'Pandey', 'Tiwari',
  'Dutta', 'Ghosh', 'Bose', 'Sen', 'Roy', 'Mehta', 'Shah', 'Kulkarni', 'Jadhav', 'Pawar',
];

function demoBulkStudentNameParts(index) {
  const i = Math.max(1, Math.floor(Number(index) || 1));
  const fi = (i - 1) % FIRST_NAMES.length;
  const li = ((i - 1) * 3 + Math.floor((i - 1) / FIRST_NAMES.length)) % LAST_NAMES.length;
  const firstName = FIRST_NAMES[fi];
  const lastName = LAST_NAMES[li];
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function parseIitmBulkRollIndex(rollOrLabel) {
  const m = String(rollOrLabel || '').match(/IITM-BULK-(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function isLegacyBulkStudentName(firstName, lastName, rollNumber) {
  const roll = String(rollNumber || '').trim();
  const last = String(lastName || '').trim();
  const first = String(firstName || '').trim();
  if (/^IITM-BULK-\d+$/i.test(roll)) {
    return first === 'Student' || last === roll || /^IITM-BULK-\d+$/i.test(last);
  }
  return false;
}

module.exports = {
  FIRST_NAMES,
  LAST_NAMES,
  demoBulkStudentNameParts,
  parseIitmBulkRollIndex,
  isLegacyBulkStudentName,
};
