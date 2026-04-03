export type ClaimStatus = 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PROCESSING' | 'SUBMITTED' | 'PENDING_REVIEW';

export interface Claim {
  id: string;
  claimant: string;
  claimantEmail: string;
  policyNumber: string;
  policyType: 'motor' | 'health' | 'property';
  claimType: string;
  claimedAmount: number;
  status: ClaimStatus;
  fraudScore: number;
  confidenceScore: number;
  submittedAt: string;
  decidedAt: string | null;
  incidentDate: string;
  location: string;
  description: string;
  rulesTriggered: string[];
  rulesFailed: string[];
  escalationReason: string | null;
  damagePhoto: string;
  ocrExtracted: Record<string, Record<string, string>>;
  documentsUploaded: string[];
  processingTimeSec: number;
  decidedBy: string;
  adjusterNote: string | null;
}

export interface AuditEntry {
  id: string;
  claimId: string;
  claimant: string;
  policyType: 'motor' | 'health' | 'property';
  claimType: string;
  claimedAmount: number;
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  decidedBy: string;
  fraudScore: number;
  confidenceScore: number;
  rulesTriggered: string[];
  rulesFailed: string[];
  processingTimeSec: number;
  timestamp: string;
  rejectionReason: string | null;
}

export const CLAIMS: Claim[] = [
{
  id: 'CLM-2026-0481',
  claimant: 'Rahul Mehta',
  claimantEmail: 'rahul.mehta@gmail.com',
  policyNumber: 'LIC-MTR-00291',
  policyType: 'motor',
  claimType: 'vehicle_damage',
  claimedAmount: 485000,
  status: 'ESCALATED',
  fraudScore: 0.74,
  confidenceScore: 0.52,
  submittedAt: '2026-04-03T08:14:22Z',
  decidedAt: null,
  incidentDate: '2026-04-01',
  location: 'NH-48, Gurgaon',
  description: 'Vehicle hit by a truck while parked on the service road. Front bumper, hood, and left fender completely damaged. Engine bay exposed.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present'],
  rulesFailed: ['amount_near_limit'],
  escalationReason: 'Claimed amount (₹4.85L) is 97% of coverage limit. Fraud score 0.74 exceeds threshold. Policy age only 18 days.',
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_1da807495-1772179850346.png",
  ocrExtracted: {
    rc_book: { vehicle_number: 'HR26DK4421', owner_name: 'Rahul Mehta', registration_date: '2024-03-15' },
    fir_copy: { fir_number: 'FIR/2026/GGN/0041', date: '2026-04-01', incident_description: 'Vehicle collision on NH-48' },
    repair_estimate: { workshop_name: 'Sharma Auto Works', vehicle_number: 'HR26DK4421', total_amount: '485000', date: '2026-04-02' },
    driving_license: { name: 'Rahul Mehta', license_number: 'HR-0120190012345', expiry_date: '2030-08-22' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 34,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0479',
  claimant: 'Priya Nair',
  claimantEmail: 'priya.nair@outlook.com',
  policyNumber: 'LIC-HLT-00184',
  policyType: 'health',
  claimType: 'medical',
  claimedAmount: 145000,
  status: 'ESCALATED',
  fraudScore: 0.61,
  confidenceScore: 0.58,
  submittedAt: '2026-04-03T07:42:10Z',
  decidedAt: null,
  incidentDate: '2026-03-28',
  location: 'Apollo Hospital, Chennai',
  description: 'Emergency appendectomy surgery. Patient admitted on 28th March, discharged on 31st March. Total bill including ICU charges.',
  rulesTriggered: ['policy_active', 'claim_type_covered'],
  rulesFailed: ['docs_incomplete'],
  escalationReason: 'Discharge summary missing. Claims this year: 2 (at limit). Fraud score 0.61.',
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_15e8f6721-1766826533888.png",
  ocrExtracted: {
    hospital_bill: { hospital_name: 'Apollo Hospitals', patient_name: 'Priya Nair', total_amount: '145000', date: '2026-03-31' },
    prescription: { doctor_name: 'Dr. Suresh Iyer', diagnosis: 'Acute Appendicitis', date: '2026-03-28' }
  },
  documentsUploaded: ['hospital_bill', 'prescription'],
  processingTimeSec: 28,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0477',
  claimant: 'Arjun Sharma',
  claimantEmail: 'arjun.sharma@yahoo.in',
  policyNumber: 'LIC-MTR-00277',
  policyType: 'motor',
  claimType: 'third_party',
  claimedAmount: 78000,
  status: 'ESCALATED',
  fraudScore: 0.68,
  confidenceScore: 0.55,
  submittedAt: '2026-04-02T16:30:05Z',
  decidedAt: null,
  incidentDate: '2026-02-28',
  location: 'Ring Road, Delhi',
  description: 'Rear-ended a two-wheeler at traffic signal. Driver sustained minor injuries. Vehicle damage to both parties. Incident occurred 34 days ago.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present'],
  rulesFailed: ['incident_age_soft'],
  escalationReason: 'Incident reported 34 days after occurrence. Fraud score 0.68 exceeds threshold.',
  damagePhoto: "https://images.unsplash.com/photo-1477951045749-77fc2ba7571e",
  ocrExtracted: {
    rc_book: { vehicle_number: 'DL3CAF2210', owner_name: 'Arjun Sharma', registration_date: '2022-11-04' },
    fir_copy: { fir_number: 'FIR/2026/DL/0892', date: '2026-02-28', incident_description: 'Rear-end collision at traffic signal' },
    repair_estimate: { workshop_name: 'Delhi Auto Center', vehicle_number: 'DL3CAF2210', total_amount: '78000', date: '2026-04-01' },
    driving_license: { name: 'Arjun Sharma', license_number: 'DL-0420170054321', expiry_date: '2027-04-18' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 41,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0474',
  claimant: 'Kavitha Reddy',
  claimantEmail: 'kavitha.reddy@gmail.com',
  policyNumber: 'LIC-HLT-00199',
  policyType: 'health',
  claimType: 'medical',
  claimedAmount: 52000,
  status: 'APPROVED',
  fraudScore: 0.12,
  confidenceScore: 0.91,
  submittedAt: '2026-04-02T11:20:44Z',
  decidedAt: '2026-04-02T11:21:18Z',
  incidentDate: '2026-04-01',
  location: 'Manipal Hospital, Bangalore',
  description: 'Dengue fever hospitalization. 4-day admission, blood transfusion required.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present', 'amount_within_limit'],
  rulesFailed: [],
  escalationReason: null,
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_147917cfe-1772226087437.png",
  ocrExtracted: {
    hospital_bill: { hospital_name: 'Manipal Hospital', patient_name: 'Kavitha Reddy', total_amount: '52000', date: '2026-04-01' },
    discharge_summary: { doctor_name: 'Dr. Anitha Rao', diagnosis: 'Dengue Fever Grade II', date: '2026-04-05' },
    prescription: { doctor_name: 'Dr. Anitha Rao', diagnosis: 'Dengue Fever', date: '2026-04-01' }
  },
  documentsUploaded: ['hospital_bill', 'discharge_summary', 'prescription'],
  processingTimeSec: 22,
  decidedBy: 'AI Pipeline (STP)',
  adjusterNote: null
},
{
  id: 'CLM-2026-0472',
  claimant: 'Sanjay Patel',
  claimantEmail: 'sanjay.patel@rediffmail.com',
  policyNumber: 'LIC-MTR-00263',
  policyType: 'motor',
  claimType: 'vehicle_damage',
  claimedAmount: 320000,
  status: 'APPROVED',
  fraudScore: 0.18,
  confidenceScore: 0.88,
  submittedAt: '2026-04-02T09:05:11Z',
  decidedAt: '2026-04-02T09:05:52Z',
  incidentDate: '2026-04-01',
  location: 'Ahmedabad-Mumbai Expressway',
  description: 'Tyre burst at high speed caused vehicle to skid and hit median. Airbags deployed. Front axle damaged.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present', 'amount_within_limit'],
  rulesFailed: [],
  escalationReason: null,
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_1e5487311-1775244102105.png",
  ocrExtracted: {
    rc_book: { vehicle_number: 'GJ01KX8823', owner_name: 'Sanjay Patel', registration_date: '2023-06-20' },
    fir_copy: { fir_number: 'FIR/2026/AHM/0134', date: '2026-04-01', incident_description: 'Tyre burst, vehicle skid on expressway' },
    repair_estimate: { workshop_name: 'Patel Motors', vehicle_number: 'GJ01KX8823', total_amount: '320000', date: '2026-04-02' },
    driving_license: { name: 'Sanjay Patel', license_number: 'GJ-0120180087654', expiry_date: '2028-01-15' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 19,
  decidedBy: 'AI Pipeline (STP)',
  adjusterNote: null
},
{
  id: 'CLM-2026-0470',
  claimant: 'Meera Krishnan',
  claimantEmail: 'meera.k@gmail.com',
  policyNumber: 'LIC-MTR-00251',
  policyType: 'motor',
  claimType: 'vehicle_damage',
  claimedAmount: 190000,
  status: 'REJECTED',
  fraudScore: 0.85,
  confidenceScore: 0.21,
  submittedAt: '2026-04-01T14:55:30Z',
  decidedAt: '2026-04-01T14:56:04Z',
  incidentDate: '2026-01-10',
  location: 'Mysore Road, Bangalore',
  description: 'Flood damage to vehicle parked in basement.',
  rulesTriggered: [],
  rulesFailed: ['incident_age_hard', 'policy_expired'],
  escalationReason: null,
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_144e750fa-1771857144897.png",
  ocrExtracted: {},
  documentsUploaded: ['rc_book'],
  processingTimeSec: 8,
  decidedBy: 'AI Pipeline (Hard Reject)',
  adjusterNote: 'Policy expired on 2026-01-05. Incident occurred 83 days before submission.'
},
{
  id: 'CLM-2026-0468',
  claimant: 'Deepak Verma',
  claimantEmail: 'deepak.verma@gmail.com',
  policyNumber: 'LIC-HLT-00172',
  policyType: 'health',
  claimType: 'medical',
  claimedAmount: 88000,
  status: 'ESCALATED',
  fraudScore: 0.72,
  confidenceScore: 0.49,
  submittedAt: '2026-04-01T10:30:15Z',
  decidedAt: null,
  incidentDate: '2026-03-30',
  location: 'Fortis Hospital, Noida',
  description: 'Knee replacement surgery post-accident. Claimed amount includes physiotherapy sessions.',
  rulesTriggered: ['policy_active', 'claim_type_covered'],
  rulesFailed: ['claims_limit_exceeded'],
  escalationReason: 'Third claim this year — exceeds max 3/year limit. Fraud score 0.72.',
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_1f518696a-1769436427622.png",
  ocrExtracted: {
    hospital_bill: { hospital_name: 'Fortis Hospital', patient_name: 'Deepak Verma', total_amount: '88000', date: '2026-03-30' },
    discharge_summary: { doctor_name: 'Dr. Ramesh Gupta', diagnosis: 'Knee Arthroplasty', date: '2026-04-02' },
    prescription: { doctor_name: 'Dr. Ramesh Gupta', diagnosis: 'Post-operative care', date: '2026-04-02' }
  },
  documentsUploaded: ['hospital_bill', 'discharge_summary', 'prescription'],
  processingTimeSec: 31,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0465',
  claimant: 'Ananya Singh',
  claimantEmail: 'ananya.singh@outlook.com',
  policyNumber: 'LIC-MTR-00248',
  policyType: 'motor',
  claimType: 'vehicle_damage',
  claimedAmount: 62000,
  status: 'APPROVED',
  fraudScore: 0.09,
  confidenceScore: 0.94,
  submittedAt: '2026-04-01T08:10:55Z',
  decidedAt: '2026-04-01T08:11:29Z',
  incidentDate: '2026-03-31',
  location: 'Bandra-Worli Sea Link, Mumbai',
  description: 'Side-swipe collision. Right door and rear quarter panel damage.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present', 'amount_within_limit'],
  rulesFailed: [],
  escalationReason: null,
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_19f1f7170-1767483361005.png",
  ocrExtracted: {
    rc_book: { vehicle_number: 'MH02BK5512', owner_name: 'Ananya Singh', registration_date: '2021-09-08' },
    fir_copy: { fir_number: 'FIR/2026/MUM/0223', date: '2026-03-31', incident_description: 'Side-swipe on sea link' },
    repair_estimate: { workshop_name: 'Mumbai Auto Clinic', vehicle_number: 'MH02BK5512', total_amount: '62000', date: '2026-04-01' },
    driving_license: { name: 'Ananya Singh', license_number: 'MH-0320200034567', expiry_date: '2030-03-22' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 17,
  decidedBy: 'AI Pipeline (STP)',
  adjusterNote: null
},
{
  id: 'CLM-2026-0462',
  claimant: 'Vikram Joshi',
  claimantEmail: 'vikram.joshi@gmail.com',
  policyNumber: 'LIC-HLT-00161',
  policyType: 'health',
  claimType: 'medical',
  claimedAmount: 195000,
  status: 'ESCALATED',
  fraudScore: 0.78,
  confidenceScore: 0.44,
  submittedAt: '2026-03-31T15:20:40Z',
  decidedAt: null,
  incidentDate: '2026-03-25',
  location: 'AIIMS, New Delhi',
  description: 'Cardiac stent placement. Emergency procedure following chest pain. 5-day ICU stay.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present'],
  rulesFailed: ['amount_near_limit'],
  escalationReason: 'Claimed amount (₹1.95L) is 97.5% of ₹2L coverage. Policy age 22 days. Fraud score 0.78.',
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_1b2c61309-1767858676887.png",
  ocrExtracted: {
    hospital_bill: { hospital_name: 'AIIMS New Delhi', patient_name: 'Vikram Joshi', total_amount: '195000', date: '2026-03-30' },
    discharge_summary: { doctor_name: 'Dr. Pradeep Sharma', diagnosis: 'Acute Coronary Syndrome - Stent Placed', date: '2026-03-30' },
    prescription: { doctor_name: 'Dr. Pradeep Sharma', diagnosis: 'Post-cardiac care', date: '2026-03-30' }
  },
  documentsUploaded: ['hospital_bill', 'discharge_summary', 'prescription'],
  processingTimeSec: 38,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0459',
  claimant: 'Sunita Agarwal',
  claimantEmail: 'sunita.agarwal@rediffmail.com',
  policyNumber: 'LIC-MTR-00235',
  policyType: 'motor',
  claimType: 'third_party',
  claimedAmount: 45000,
  status: 'APPROVED',
  fraudScore: 0.14,
  confidenceScore: 0.89,
  submittedAt: '2026-03-31T12:05:22Z',
  decidedAt: '2026-03-31T12:05:58Z',
  incidentDate: '2026-03-30',
  location: 'Connaught Place, New Delhi',
  description: 'Minor collision with auto-rickshaw. Third party driver compensated. Police report filed.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present', 'amount_within_limit'],
  rulesFailed: [],
  escalationReason: null,
  damagePhoto: "https://images.unsplash.com/photo-1533153171142-ea631f591ab4",
  ocrExtracted: {
    rc_book: { vehicle_number: 'DL7CQ1144', owner_name: 'Sunita Agarwal', registration_date: '2020-02-14' },
    fir_copy: { fir_number: 'FIR/2026/DL/0711', date: '2026-03-30', incident_description: 'Minor collision with auto-rickshaw' },
    repair_estimate: { workshop_name: 'Capital Auto Service', vehicle_number: 'DL7CQ1144', total_amount: '45000', date: '2026-03-31' },
    driving_license: { name: 'Sunita Agarwal', license_number: 'DL-0520160098765', expiry_date: '2026-05-10' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 21,
  decidedBy: 'AI Pipeline (STP)',
  adjusterNote: null
},
{
  id: 'CLM-2026-0456',
  claimant: 'Rajan Pillai',
  claimantEmail: 'rajan.pillai@gmail.com',
  policyNumber: 'LIC-MTR-00228',
  policyType: 'motor',
  claimType: 'vehicle_damage',
  claimedAmount: 410000,
  status: 'ESCALATED',
  fraudScore: 0.81,
  confidenceScore: 0.38,
  submittedAt: '2026-03-30T09:45:00Z',
  decidedAt: null,
  incidentDate: '2026-03-15',
  location: 'Thiruvananthapuram Bypass',
  description: 'Vehicle total loss after collision with lorry. Complete front-end damage. Towed to workshop.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present'],
  rulesFailed: ['amount_near_limit', 'claims_this_year'],
  escalationReason: 'Second claim this year. Amount 82% of limit. Policy 15 days old. Fraud score 0.81 — high risk.',
  damagePhoto: "https://images.unsplash.com/photo-1485865322517-1db053cf1101",
  ocrExtracted: {
    rc_book: { vehicle_number: 'KL01BZ9921', owner_name: 'Rajan Pillai', registration_date: '2025-03-10' },
    fir_copy: { fir_number: 'FIR/2026/TVM/0088', date: '2026-03-15', incident_description: 'Head-on collision with lorry' },
    repair_estimate: { workshop_name: 'Kerala Auto Works', vehicle_number: 'KL01BZ9921', total_amount: '410000', date: '2026-03-18' },
    driving_license: { name: 'Rajan Pillai', license_number: 'KL-0120190076543', expiry_date: '2029-01-30' }
  },
  documentsUploaded: ['rc_book', 'fir_copy', 'repair_estimate', 'driving_license'],
  processingTimeSec: 44,
  decidedBy: 'AI Pipeline',
  adjusterNote: null
},
{
  id: 'CLM-2026-0453',
  claimant: 'Nisha Gupta',
  claimantEmail: 'nisha.gupta@gmail.com',
  policyNumber: 'LIC-HLT-00148',
  policyType: 'health',
  claimType: 'medical',
  claimedAmount: 31000,
  status: 'APPROVED',
  fraudScore: 0.08,
  confidenceScore: 0.96,
  submittedAt: '2026-03-29T14:30:10Z',
  decidedAt: '2026-03-29T14:30:44Z',
  incidentDate: '2026-03-28',
  location: 'Max Hospital, Pune',
  description: 'Fractured wrist — fall from stairs. Cast applied. 2-day admission.',
  rulesTriggered: ['policy_active', 'claim_type_covered', 'docs_present', 'amount_within_limit'],
  rulesFailed: [],
  escalationReason: null,
  damagePhoto: "https://img.rocket.new/generatedImages/rocket_gen_img_186549990-1775244099972.png",
  ocrExtracted: {
    hospital_bill: { hospital_name: 'Max Hospital', patient_name: 'Nisha Gupta', total_amount: '31000', date: '2026-03-29' },
    discharge_summary: { doctor_name: 'Dr. Amit Kulkarni', diagnosis: 'Distal Radius Fracture', date: '2026-03-30' },
    prescription: { doctor_name: 'Dr. Amit Kulkarni', diagnosis: 'Fracture management', date: '2026-03-28' }
  },
  documentsUploaded: ['hospital_bill', 'discharge_summary', 'prescription'],
  processingTimeSec: 16,
  decidedBy: 'AI Pipeline (STP)',
  adjusterNote: null
}];


export const AUDIT_ENTRIES: AuditEntry[] = CLAIMS.filter((c) => c.status !== 'PROCESSING' && c.status !== 'SUBMITTED').map((c) => ({
  id: `AUD-${c.id}`,
  claimId: c.id,
  claimant: c.claimant,
  policyType: c.policyType,
  claimType: c.claimType,
  claimedAmount: c.claimedAmount,
  decision: c.status === 'PENDING_REVIEW' ? 'ESCALATED' : c.status as 'APPROVED' | 'REJECTED' | 'ESCALATED',
  decidedBy: c.decidedBy,
  fraudScore: c.fraudScore,
  confidenceScore: c.confidenceScore,
  rulesTriggered: c.rulesTriggered,
  rulesFailed: c.rulesFailed,
  processingTimeSec: c.processingTimeSec,
  timestamp: c.decidedAt ?? c.submittedAt,
  rejectionReason: c.adjusterNote
}));

export const CLAIMS_VOLUME_DATA = [
{ date: 'Mar 21', total: 8, approved: 5, escalated: 2, rejected: 1 },
{ date: 'Mar 22', total: 12, approved: 7, escalated: 3, rejected: 2 },
{ date: 'Mar 23', total: 6, approved: 4, escalated: 1, rejected: 1 },
{ date: 'Mar 24', total: 15, approved: 9, escalated: 4, rejected: 2 },
{ date: 'Mar 25', total: 11, approved: 6, escalated: 3, rejected: 2 },
{ date: 'Mar 26', total: 9, approved: 5, escalated: 3, rejected: 1 },
{ date: 'Mar 27', total: 18, approved: 11, escalated: 5, rejected: 2 },
{ date: 'Mar 28', total: 14, approved: 8, escalated: 4, rejected: 2 },
{ date: 'Mar 29', total: 10, approved: 7, escalated: 2, rejected: 1 },
{ date: 'Mar 30', total: 16, approved: 9, escalated: 5, rejected: 2 },
{ date: 'Mar 31', total: 13, approved: 8, escalated: 3, rejected: 2 },
{ date: 'Apr 01', total: 19, approved: 11, escalated: 6, rejected: 2 },
{ date: 'Apr 02', total: 22, approved: 14, escalated: 6, rejected: 2 },
{ date: 'Apr 03', total: 11, approved: 6, escalated: 4, rejected: 1 }];


export const FRAUD_DIST_DATA = [
{ range: '0–20%', count: 18 },
{ range: '21–40%', count: 11 },
{ range: '41–60%', count: 7 },
{ range: '61–80%', count: 9 },
{ range: '81–100%', count: 5 }];