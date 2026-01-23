import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
console.log(API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if we are already on an auth page or if the error came from an auth endpoint
    const isAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/');
    const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signup');

    if (error.response?.status === 401 && !isAuthPage && !isAuthRequest) {
      // Handle unauthorized - redirect to login only if not on auth page/request
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  verifyEmail: (token: string) => api.post('/auth/verify', { token }),
};

// Profile API
export const profileAPI = {
  getCandidate: (userId: string) => api.get(`/profiles/candidate/${userId}`),
  updateCandidate: (data: any) => api.post('/profiles/candidate', data),
  getRecruiter: (userId: string) => api.get(`/profiles/recruiter/${userId}`),
  updateRecruiter: (data: any) => api.post('/profiles/recruiter', data),
  // Recruiter: list candidates prioritized by country match
  listCandidates: () => api.get('/profiles/candidates'),

  // Skills
  addSkill: (data: any) => api.post('/profiles/candidate/skills', data),
  updateSkill: (skillId: string, data: any) => api.put(`/profiles/candidate/skills/${skillId}`, data),
  deleteSkill: (skillId: string) => api.delete(`/profiles/candidate/skills/${skillId}`),
  getUnverifiedSkills: () => api.get('/profiles/candidate/skills/unverified'),
  generateSkillExam: (unverifiedSkillId: string) => api.post(`/profiles/candidate/skills/unverified/${unverifiedSkillId}/exam`),
  submitSkillExam: (data: { examId: string; answers: Array<{ questionIndex: number; answer: string }> }) => api.post('/profiles/candidate/skills/unverified/submit-exam', data),

  // Experience
  addExperience: (data: any) => api.post('/profiles/candidate/experience', data),
  updateExperience: (id: string, data: any) => api.put(`/profiles/candidate/experience/${id}`, data),
  deleteExperience: (id: string) => api.delete(`/profiles/candidate/experience/${id}`),

  // Projects
  addProject: (data: any) => api.post('/profiles/candidate/projects', data),
  updateProject: (id: string, data: any) => api.put(`/profiles/candidate/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/profiles/candidate/projects/${id}`),

  // Education
  addEducation: (data: any) => api.post('/profiles/candidate/education', data),
  updateEducation: (id: string, data: any) => api.put(`/profiles/candidate/education/${id}`, data),
  deleteEducation: (id: string) => api.delete(`/profiles/candidate/education/${id}`),

  // Certifications
  addCertification: (data: any) => api.post('/profiles/candidate/certifications', data),
  updateCertification: (id: string, data: any) => api.put(`/profiles/candidate/certifications/${id}`, data),
  deleteCertification: (id: string) => api.delete(`/profiles/candidate/certifications/${id}`),

  // Job Preferences
  updateJobPreferences: (data: any) => api.post('/profiles/candidate/job-preferences', data),

  // Resume Upload
  uploadResume: (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    return api.post('/profiles/candidate/upload-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Resume Download
  downloadResume: (candidateId: string) => {
    return api.get(`/profiles/candidate/${candidateId}/download-resume`, {
      responseType: 'blob',
    })
  },
};

// Jobs API
export const jobsAPI = {
  getAll: (params?: any) => api.get('/jobs', { params }),
  getById: (jobId: string) => api.get(`/jobs/${jobId}`),
  incrementView: (jobId: string) => api.post(`/jobs/${jobId}/view`),
  getRecruiterJobs: (params?: any) => api.get('/jobs/recruiter/my-jobs', { params }),
  create: (data: any) => api.post('/jobs', data),
  update: (jobId: string, data: any) => api.put(`/jobs/${jobId}`, data),
  delete: (jobId: string) => api.delete(`/jobs/${jobId}`),
  updateStatus: (jobId: string, status: string) => api.patch(`/jobs/${jobId}/status`, { status }),
};

// Applications API
export const applicationsAPI = {
  // Candidate endpoints
  apply: (data: any) => api.post('/applications', data),
  getCandidateApplications: (params?: any) => api.get('/applications/candidate', { params }),
  getCandidateApplicationById: (applicationId: string) => api.get(`/applications/candidate/${applicationId}`),
  withdrawApplication: (applicationId: string) => api.delete(`/applications/candidate/${applicationId}`),

  // Recruiter endpoints
  getJobApplications: (jobId: string, params?: any) => api.get(`/applications/job/${jobId}`, { params }),
  getApplicationById: (applicationId: string) => api.get(`/applications/${applicationId}`),
  updateApplicationStatus: (applicationId: string, status: string) => api.patch(`/applications/${applicationId}/status`, { status }),
};

// AI Analysis API
export const aiAnalysisAPI = {
  // Job skills analysis (for recruiters)
  analyzeJobSkills: (jobId: string) => api.post(`/ai/jobs/${jobId}/analyze-skills`),

  // Candidate-job skill match analysis
  analyzeCandidateJobMatch: (jobId: string) => api.post(`/ai/jobs/${jobId}/analyze-match`),

  // Get skill recommendations
  getSkillRecommendations: (jobId: string) => api.get(`/ai/jobs/${jobId}/recommendations`),

  // Trigger re-analysis
  triggerReanalysis: (jobId: string, candidateId: string) => api.post('/ai/reanalyze', { jobId, candidateId }),

  // Analyze applicant compatibility
  analyzeApplicantCompatibility: (applicationId: string) => api.post(`/ai/applications/${applicationId}/analyze`),

  // Generate course summary
  generateCourseSummary: (courseData: any) => api.post('/ai/courses/summary', courseData),

  // Generate course mind map
  generateCourseMindMap: (courseData: any) => api.post('/ai/courses/mindmap', courseData),

  // Generate course study notes
  generateCourseNotes: (courseData: any) => api.post('/ai/courses/notes', courseData),

  // Generate course exam
  generateCourseExam: (data: { topic: string }) => api.post('/ai/courses/exam', data),
};

// Saved Jobs API
export const savedJobsAPI = {
  // Save/bookmark a job
  saveJob: (jobId: string) => api.post(`/saved-jobs/saved/${jobId}`),

  // Remove saved job
  removeSavedJob: (jobId: string) => api.delete(`/saved-jobs/saved/${jobId}`),

  // Get all saved jobs
  getSavedJobs: () => api.get('/saved-jobs/saved'),

  // Add job to interested list
  addInterestedJob: (jobId: string) => api.post(`/saved-jobs/interested/${jobId}`),

  // Remove job from interested list
  removeInterestedJob: (jobId: string) => api.delete(`/saved-jobs/interested/${jobId}`),

  // Get all interested jobs
  getInterestedJobs: () => api.get('/saved-jobs/interested'),

  // Get learning roadmap
  getLearningRoadmap: (params?: any) => api.get('/saved-jobs/roadmap', { params }),

  // Check if job is saved/interested
  checkJobStatus: (jobId: string) => api.get(`/saved-jobs/check/${jobId}`),
};

// Interview API
export const interviewAPI = {
  // Get all jobs with selected candidates for interview
  getRecruiterInterviews: () => api.get('/interviews'),

  // Get selected candidates for a specific job
  getJobInterviewCandidates: (jobId: string) => api.get(`/interviews/job/${jobId}/candidates`),

  // Update application status
  updateApplicationStatus: (applicationId: string, data: { status: string; notes?: string }) =>
    api.put(`/interviews/application/${applicationId}/status`, data),

  // Get or create conversation for an application
  getOrCreateConversation: (applicationId: string) =>
    api.get(`/interviews/application/${applicationId}/conversation`),

  // Quick Assign AI Interview (FormData for file upload)
  assignQuickInterview: (data: FormData) =>
    api.post('/interviews/assign-quick', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Get inbox candidates (shortlisted, interview, hired)
  getRecruiterInboxCandidates: () => api.get('/interviews/inbox-candidates'),
};

// Messaging API
export const messagingAPI = {
  // Get all conversations for candidate
  getCandidateConversations: () =>
    api.get('/messages/conversations'),

  // Get all conversations for recruiter
  getRecruiterConversations: () =>
    api.get('/messages/recruiter/conversations'),

  // Send a message
  sendMessage: (conversationId: string, data: { content: string; message_type?: string }) =>
    api.post(`/messages/conversation/${conversationId}/send`, data),

  // Get messages in a conversation
  getMessages: (conversationId: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/messages/conversation/${conversationId}`, { params }),

  // Mark messages as read
  markMessagesAsRead: (conversationId: string, messageIds: string[]) =>
    api.put(`/messages/conversation/${conversationId}/read`, { messageIds }),

  // Get conversation details
  getConversation: (conversationId: string) =>
    api.get(`/messages/conversation/${conversationId}/details`),

  // Initiate a call (recruiter only)
  initiateCall: (conversationId: string) =>
    api.post(`/messages/conversation/${conversationId}/call`),

  // Update call status
  updateCallStatus: (callId: string, data: { status: string; notes?: string }) =>
    api.put(`/messages/call/${callId}/status`, data),

  // Get call history
  getCallHistory: (conversationId: string) =>
    api.get(`/messages/conversation/${conversationId}/calls`),
};

// Community API
export const communityAPI = {
  getPosts: (type: string = 'official', page: number = 1) => api.get('/community/posts', { params: { type, page } }),
  createPost: (content: string, type: string = 'official', imageUrl?: string) => api.post('/community/posts', { content, type, imageUrl }),
  toggleLike: (postId: string) => api.post(`/community/posts/${postId}/like`),
};

// Courses API
export const coursesAPI = {
  // Get all active courses for the candidate
  getMyCourses: () => api.get('/courses/my-courses'),

  // Get archived courses
  getArchivedCourses: () => api.get('/courses/archived'),

  // Auto-populate courses for all skills in roadmap
  autoPopulate: () => api.post('/courses/auto-populate'),

  // Add a course for a specific skill
  addCourse: (data: { skillName: string; skillLevel: string; phaseNumber?: number; learningPath?: string }) =>
    api.post('/courses/add', data),

  // Update watch status
  updateWatchStatus: (courseId: string, isWatched: boolean) =>
    api.put(`/courses/${courseId}/watch`, { isWatched }),

  // Delete a course
  deleteCourse: (courseId: string) => api.delete(`/courses/${courseId}`),
};

// Upload API
export const uploadAPI = {
  uploadProfileImage: (formData: FormData) =>
    api.post('/upload/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// CV/Profile Assistant API
export const cvAPI = {
  // Get full profile data for CV
  getProfile: () => api.get('/cv/profile'),

  // Generate professional summary
  generateSummary: () => api.post('/cv/summary'),

  // Enhance bullet points for experience/projects
  enhanceBullets: (type: 'experience' | 'projects') =>
    api.post('/cv/enhance-bullets', { type }),

  // Generate recommendations
  generateRecommendations: () => api.post('/cv/recommendations'),
};

// Video Call API
export const videoCallAPI = {
  // Generate token
  generateToken: (data: { conversationId: string; channelName?: string }) =>
    api.post('/video-calls/token', data),

  // Start call
  startCall: (conversationId: string) =>
    api.post('/video-calls/start', { conversationId }),

  // End call
  endCall: (callId: string) =>
    api.put(`/video-calls/${callId}/end`),

  // Get history
  getHistory: (conversationId: string) =>
    api.get(`/video-calls/conversation/${conversationId}/history`),

  // Schedule interview
  scheduleInterview: (data: { conversationId: string; scheduledAt: string; title?: string; description?: string }) =>
    api.post('/video-calls/schedule', data),

  // Get scheduled interviews
  getScheduledInterviews: () =>
    api.get('/video-calls/scheduled'),

  // Cancel scheduled interview
  cancelInterview: (interviewId: string) =>
    api.delete(`/video-calls/scheduled/${interviewId}`),
};

// External Jobs API
export const externalJobsAPI = {
  // Search external jobs using SerpAPI
  searchJobs: (params?: { query?: string; location?: string; ltype?: string; chips?: string; uds?: string; platforms?: string }) =>
    api.get('/external-jobs', { params }),

  // Get external job details
  getJobDetails: (jobId: string) =>
    api.get(`/external-jobs/${jobId}`),
};

// Admin API
export const adminAPI = {
  // Register new admin (requires admin role)
  registerAdmin: (data: { email: string; password: string; fullName: string }) =>
    api.post('/admin/register', data),

  // Get dashboard analytics
  getDashboardAnalytics: () =>
    api.get('/admin/dashboard'),

  // Get detailed analytics with AI insights
  getDetailedAnalytics: (period?: string) =>
    api.get('/admin/analytics', { params: { period } }),
};

// Agora Video Call API
export const agoraAPI = {
  // Generate RTC token for video call
  generateToken: (data: { channelName: string; uid?: number; role?: 'publisher' | 'subscriber' }) =>
    api.post('/agora/token', data),
};



