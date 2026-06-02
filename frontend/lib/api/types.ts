export type CompanyLoginPayload = {
  email: string;
  password: string;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  truncated?: boolean;
};

export type StudentApplicationStatus = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  status: "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
  appliedOn: string;
};

export type JourneyStageDef = {
  id: string;
  type: string;
  label: string;
};

export type CompanyApplicantItem = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
  appliedOn: string;
  resumeFile?: string;
  branch?: string;
  batch?: string;
  phone?: string;
  skills?: string;
  priScore?: number;
  psychometricScore?: number;
  psychometricTitle?: string;
  companyFeedback?: string;
  rank?: number;
};

export type CompanyCollegeInviteItem = {
  id: string;
  jobId: string;
  jobTitle: string;
  collegeEmail: string;
  status: "Sent" | "Failed";
  sentAt: string;
  note: string;
  errorMessage: string;
  tpoResponse?: "Pending" | "Accepted" | "Declined";
  declineReason?: string;
  recruitmentStage?: string;
  applicationDeadline?: string;
  eligibilityBranch?: string;
  eligibilityBatch?: string;
};

export type InboundJobSummary = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyUser: string;
  collegeEmail: string;
  emailStatus: string;
  tpoResponse: "Pending" | "Accepted" | "Declined";
  recruitmentStage: string;
  applicationDeadline: string;
  eligibilityBranch: string;
  eligibilityBatch: string;
  eligibilityNote: string;
  companyNote: string;
  declineReason: string;
  sentAt: string;
  tpoRespondedAt: string;
  job?: JobItem | null;
};

export type InboundEligibleStudent = {
  studentId: string;
  fullName: string;
  email: string;
  branch: string;
  batch: string;
  courseClassGrade?: string;
  resumeFile?: string;
};

export type InboundCollegeApplicant = InboundEligibleStudent & {
  priScore?: number;
  psychometricScore?: number;
  psychometricTitle?: string;
  companyFeedback?: string;
  eligible: boolean;
  suggestedByTpo?: boolean;
  bypassPri?: boolean;
  applicationStatus: string;
  applicationId?: string;
  appliedOn?: string;
};

export type InboundJobDetail = {
  invite: InboundJobSummary;
  eligibleStudents: InboundEligibleStudent[];
  suggestedStudents: InboundEligibleStudent[];
  collegeApplicants?: InboundCollegeApplicant[];
  stages: string[];
  journeyStages?: string[];
};

export type ApplicationStatus = "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
export type ShortlistSchedulePayload = {
  gmeetLink: string;
  scheduleAt: string;
};

export type StudentPublicJobApplyInfo = {
  publicApplicationsUsed: number;
  withoutPriCap: number;
  hasPriScore: boolean;
  canApplyToPublicJobboard: boolean;
  remainingWithoutPri: number | null;
};

export type StudentDashboardProfileFlags = {
  profileSubmitted?: boolean;
  profileEditRequested?: boolean;
  profileEditApproved?: boolean;
  profileComplete?: boolean;
  canApplyToJobs?: boolean;
  canApplyToGeneralJobboard?: boolean;
  priScore?: number;
};

export type StudentDashboardData = {
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  listJobs: JobItem[];
  suggestedJobs: JobItem[];
  applicationStatus: StudentApplicationStatus[];
  applicationsTruncated?: boolean;
  internalPostings?: TpoPosting[];
  publicJobApply?: StudentPublicJobApplyInfo;
  profileFlags?: StudentDashboardProfileFlags;
  collegiateInvite?: StudentCollegiateInvite | null;
  candidateType?: string;
  jobsUsePagination?: boolean;
};

export type ListStudentJobsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  locationType?: string;
  opportunityType?: string;
  minExperience?: string;
};

export type ListStudentJobsResult = {
  jobs: JobItem[];
  pagination: PaginationMeta;
};

export type StudentLmsCourse = {
  id: number;
  shortname: string;
  fullname: string;
  categoryid?: number;
};

export type TpoPosting = {
  id: string;
  title: string;
  description: string;
  branch: string;
  batch: string;
  eligibilityCriteria: string;
  posterFile: string;
  applicationLink: string;
  companyEmail: string;
  status: "Draft" | "Active" | "Closed";
  createdByTpo: string;
  validTill: string;
  isInternalJob?: boolean;
  batchAudience?: "All Students" | "Specific Batches";
  targetBatches?: string;
  postingType?: string;
  audienceDescription?: string;
};

export type TpoPostingPayload = {
  title: string;
  description: string;
  branch: string;
  batch: string;
  eligibilityCriteria: string;
  posterFile: string;
  applicationLink: string;
  companyEmail: string;
  status: "Draft" | "Active" | "Closed";
  validTill: string;
  isInternalJob?: boolean;
  batchAudience?: "All Students" | "Specific Batches";
  targetBatches?: string;
  notifyStudents?: boolean;
  postingType?: string;
  audienceDescription?: string;
};

export const TPO_POSTING_TYPES = [
  "Summer Internship",
  "Winter Internship",
  "Full-time Placement",
  "Part-time / Contract",
  "Campus Drive",
  "Workshop / Event",
  "Other",
] as const;

export type TpoApplicant = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  branch: string;
  batch: string;
  courseClassGrade: string;
  resumeFile: string;
};

export type TpoStudentInvite = {
  id: string;
  email: string;
  branch: string;
  batch: string;
  year: string;
  status: "Pending" | "Accepted" | "Expired";
  expiresAt: string;
  acceptedAt: string;
};

export type TpoProfile = {
  tpoName: string;
  collegeName: string;
  country: string;
  state: string;
  district: string;
  collegeLocation: string;
  address: string;
  pincode: string;
  websiteLink: string;
  linkedinUrl: string;
  socialMediaLink: string;
};

export type TpoAccountStatus = {
  approvalStatus: "Pending" | "Approved" | "Rejected";
  isCollegeManager: boolean;
  collegeSetupComplete: boolean;
  managerCategory: string;
  rejectionReason: string;
  canAccessDashboard: boolean;
  needsCollegeSetup: boolean;
};

export type TpoCollegeDepartment = {
  id?: string;
  departmentName: string;
  hodName: string;
  hodEmail: string;
  hodPhone: string;
};

/** Stored as Scout College Branch; shown in UI as a batch row. */
export type TpoCollegeBranch = {
  id?: string;
  batchName: string;
  departmentName: string;
  passoutYear: string;
};

export type TpoCollegePassoutYear = {
  id?: string;
  passoutYear: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
};

export type TpoCollegeBatch = {
  id?: string;
  batchName: string;
  departmentName: string;
  branchName: string;
  passoutYear: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
};

export type TpoCollegeSetupPayload = {
  profile: TpoProfile;
  departments: TpoCollegeDepartment[];
  branches: TpoCollegeBranch[];
  passoutYears: TpoCollegePassoutYear[];
  batches: TpoCollegeBatch[];
};

export type AdminPendingTpo = {
  profileId: string;
  tpoUser: string;
  tpoName: string;
  collegeName: string;
  country: string;
  state: string;
  collegeLocation: string;
  approvalStatus: string;
  registeredAt: string;
  email: string;
};

export type AdminPendingFreelancer = {
  profileId: string;
  freelancerUser: string;
  fullName: string;
  phone: string;
  primaryService: string;
  skills: string;
  yearsOfExperience: string;
  approvalStatus: string;
  profileSubmitted: boolean;
  submittedAt: string;
  registeredAt: string;
  email: string;
  resumeFile: string;
  idProofFile: string;
};

/** Full freelancer interviewer profile returned for admin review. */
export type AdminFreelancerProfileDetail = {
  profileId: string;
  freelancerUser: string;
  registeredAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  professionalSummary?: string;
  skills?: string;
  yearsOfExperience?: string;
  primaryService?: string;
  hourlyRate?: string;
  availability?: string;
  linkedinProfile?: string;
  githubProfile?: string;
  portfolioWebsite?: string;
  resumeFile?: string;
  idProofFile?: string;
  workExperience?: string;
  profileConsent?: boolean;
  profileSubmitted?: boolean;
  submittedAt?: string;
  approvalStatus?: string;
  rejectionReason?: string;
  profileComplete?: boolean;
  canApplyToJobs?: boolean;
  profileLocked?: boolean;
  documents?: { name?: string; documentType: string; description?: string; file: string }[];
};

export type TpoAddStudentPayload = {
  email: string;
  batch: string;
  branch: string;
  year: string;
};

export type TpoListedStudent = {
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  areaOfStudy: string;
  batch: string;
  branch: string;
  state: string;
  country: string;
  courseClassGrade: string;
  resumeFile: string;
  /** Set when row is from an invite and the student has not registered yet. */
  inviteStatus?: string;
  isPendingInvite?: boolean;
};

export type TpoStudentsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** True when directory size may exceed server cap (10k). */
  truncated?: boolean;
};

export type TpoStudentsDirectoryCount = {
  total: number;
  profileCount: number;
  inviteCount: number;
  truncated: boolean;
};

export type TpoStudentsListResult = {
  students: TpoListedStudent[];
  pagination: TpoStudentsPagination;
};

export type TpoBulkUploadSummary = {
  async?: boolean;
  uploadId?: string;
  status?: string;
  totalRows?: number;
  processed: number;
  profilesUpdated: number;
  profilesCreated: number;
  invitesCreated: number;
  skipped: number;
  errors: string[];
};

export type TpoBulkUploadStatus = {
  status: string;
  message?: string;
  totalRows?: number;
  processed?: number;
  profilesUpdated?: number;
  profilesCreated?: number;
  invitesCreated?: number;
  skipped?: number;
  errors?: string[];
};

export type StudentLmsContext = {
  enabled: boolean;
  provider: string;
  launchUrl: string;
  moodleUserId?: number;
  message?: string;
  courses: StudentLmsCourse[];
};

export type StudentCollegiateInvite = {
  inviteId: string;
  tpoName: string;
  collegeName: string;
  suggestedBranch: string;
  suggestedBatch: string;
  suggestedYear: string;
};

export type StudentProfileData = {
  fullName: string;
  email: string;
  phone: string;
  profilePhoto: string;
  dateOfBirth: string;
  gender: string;
  parentGuardianName: string;
  parentContactNumber: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
  college: string;
  universityName: string;
  school: string;
  areaOfStudy: string;
  courseClassGrade: string;
  departmentStream: string;
  academicYear: string;
  semester: string;
  rollNumber: string;
  admissionYear: string;
  expectedGraduationYear: string;
  currentCgpa: string;
  skills: string;
  certifications: string;
  areasOfInterest: string;
  internshipExperience: string;
  projectTitle: string;
  preferredJobRole: string;
  resumeFile: string;
  studentIdCardNumber: string;
  aadhaarNumber: string;
  aadhaarVerified?: boolean;
  linkedinProfile: string;
  githubProfile: string;
  portfolioWebsite: string;
  profileConsent: boolean;
  candidateType?: string;
  linkedTpoUser?: string;
  collegiateInvite?: StudentCollegiateInvite | null;
  profileSubmitted?: boolean;
  profileEditRequested?: boolean;
  profileEditApproved?: boolean;
  profileComplete?: boolean;
  canApplyToJobs?: boolean;
  canApplyToGeneralJobboard?: boolean;
  publicJobApply?: StudentPublicJobApplyInfo;
  priScore?: number;
};

export type StudentProfileUpdatePayload = StudentProfileData & {
  finalizeProfile?: boolean;
};

export type StudentProfileEditRequestItem = {
  studentId: string;
  fullName: string;
  email: string;
  college: string;
  batch: string;
  branch: string;
  profileComplete: boolean;
};

export type RegisterPayload = {
  email: string;
  password: string;
  role: "Company" | "Student" | "Job Seeker" | "Training & Placement Officer" | "Internal Team" | "Freelancer";
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Employer (Company role) organization name */
  companyName?: string;
  /** TPO college / institution name */
  collegeName?: string;
};

export type CompanyMagicDashboard = {
  companyEmail: string;
  posting: {
    id: string;
    title: string;
    description: string;
    branch: string;
    batch: string;
    eligibilityCriteria: string;
    posterFile: string;
    applicationLink: string;
    status: string;
    validTill: string;
  };
  applicants: TpoApplicant[];
};

export type CollegeOption = {
  name: string;
  stateProvince?: string;
  website?: string;
};

export type JobItem = {
  id: string;
  title: string;
  opportunityType: "Job" | "Internship";
  locationType: "In office" | "Hybrid" | "Remote";
  openings: number;
  skills: string;
  minExperience: string;
  status: "Draft" | "Active" | "Closed";
  totalViews: number;
  applications: number;
  createdAt: string;
  description: string;
  companyName: string;
  companyAbout: string;
  isApplied?: boolean;
  suggestedByTpo?: boolean;
  applicationStatus?: "Not Applied" | "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
  journeyStages?: string[];
  journeyStageDefs?: JourneyStageDef[];
};

export type JobRecruitmentJourneyData = {
  job: JobItem;
  journeyStages: string[];
  journeyStageDefs?: JourneyStageDef[];
  colleges: CompanyCollegeInviteItem[];
  selectedCollege: CompanyCollegeInviteItem | null;
  collegeApplicants: InboundCollegeApplicant[];
};

export type AssessmentScheduleMode = "Scheduled" | "Floating";
export type AssessmentQuestionClass = "MCQ Single" | "MCQ Multi" | "MCQ Weighted" | "Descriptive" | "Coding";
export type AssessmentProctoringLevel = "None" | "Standard" | "Full";
export type AssessmentIntegrationMode = "Frappe Native" | "TAO" | "Frappe + TAO";

export type AssessmentItem = {
  id: string;
  title: string;
  description: string;
  scheduleMode: AssessmentScheduleMode;
  questionClass: AssessmentQuestionClass;
  mcqScoringMode: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  windowStart: string;
  windowEnd: string;
  proctoringLevel: AssessmentProctoringLevel;
  integrationMode: AssessmentIntegrationMode;
  questionsJson: unknown[];
  coinsSpent: number;
  status: "Draft" | "Published" | "Closed";
  taoSyncStatus?: string;
  taoExternalId?: string;
  taoLaunchUrl?: string;
  taoSyncMessage?: string;
};

export type AssessmentFormPayload = {
  title: string;
  description: string;
  scheduleMode: AssessmentScheduleMode;
  questionClass: AssessmentQuestionClass;
  mcqScoringMode: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  windowStart: string;
  windowEnd: string;
  proctoringLevel: AssessmentProctoringLevel;
  integrationMode: AssessmentIntegrationMode;
  questionsJson: string;
};

export type CompanyCoinPack = { id: string; coins: number; priceInr: number };

export type CompanyCreditWallet = {
  balanceCredits: number;
  coinPriceInr: number;
  rates: {
    assessment: number;
    freelanceInterview: number;
    fullProctoring: number;
    standardProctoring: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    credits: number;
    amountInr: number;
    note: string;
    at: string;
  }>;
};

export type JobFormPayload = {
  title: string;
  opportunityType: "Job" | "Internship";
  minExperience: string;
  skills: string;
  locationType: "In office" | "Hybrid" | "Remote";
  workType: "Part-time" | "Full-time";
  openings: number;
  description: string;
  preferences: string;
  minSalary: string;
  maxSalary: string;
  screeningQuestion: string;
  journeyStages?: JourneyStageDef[];
};

export type CompanyLoginResponse = {
  ok: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      full_name: string;
      email: string;
      isSubAdmin?: boolean;
      assignedDistrict?: string;
      assignedState?: string;
      companyName?: string;
      companyUserId?: string;
    };
    roles: string[];
  };
};

export type TpoReportKey =
  | "applications"
  | "training-attendance"
  | "test-scores"
  | "recruitment-status"
  | "job-selections"
  | "eligibility-students";

export type TpoReportJobOption = { jobId: string; title: string; status: string };
export type TpoReportPostingOption = { postingId: string; title: string; status: string };

export type TpoApplicationReportRow = TpoListedStudent & {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  applicationStatus: string;
  appliedOn: string;
};

export type TpoTrainingReportRow = TpoListedStudent & {
  assignmentsTotal: number;
  assignmentsCompleted: number;
  attendedAllTrainings: boolean;
  assessmentTitles: string;
  lastCompletedAt: string;
};

export type TpoTestScoreReportRow = TpoListedStudent & {
  resultId: string;
  assignmentId: string;
  assessmentTitle: string;
  overallScore: number;
  scoresSummary: string;
  completedAt: string;
};

export type TpoRecruitmentReportRow = TpoListedStudent & {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  recruitmentStatus: string;
};

export type TpoJobSelectionReportRow = TpoListedStudent & {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  applicationStatus: string;
  appliedOn: string;
};

export type TpoRecruitmentByJob = {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  submitted: number;
  inReview: number;
  shortlisted: number;
  rejected: number;
  selected: number;
  total: number;
};

export type TpoStudent360Kpis = {
  priScore: number;
  profileCompletionPercent: number;
  profileComplete: boolean;
  applicationsTotal: number;
  applicationsShortlisted: number;
  applicationsPlaced: number;
  assessmentsAssigned: number;
  assessmentsCompleted: number;
  psychometricResultsCount: number;
  mockExamsCount: number;
};

export type TpoStudent360Charts = {
  applicationsByStatus: { status: string; count: number }[];
  psychometricScores: { title: string; score: number; date: string }[];
  profileSections: { section: string; percent: number; filled: number; total: number }[];
};

export type TpoStudent360Application = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobStatus: string;
  applicationStatus: string;
  appliedOn: string;
};

export type TpoStudent360Psychometric = {
  resultId: string;
  assessmentTitle: string;
  overallScore: number;
  completedAt: string;
  scores: Record<string, number>;
};

export type TpoStudent360Data = {
  studentId: string;
  profile: StudentProfileData;
  kpis: TpoStudent360Kpis;
  charts: TpoStudent360Charts;
  tables: {
    applications: TpoStudent360Application[];
    psychometricResults: TpoStudent360Psychometric[];
    trainingAssignments: {
      assignmentId: string;
      assessmentTitle: string;
      status: string;
      dueAt: string;
      completedAt: string;
    }[];
    mockExams: { registrationId: string; examTitle: string; status: string; score: number }[];
  };
};

