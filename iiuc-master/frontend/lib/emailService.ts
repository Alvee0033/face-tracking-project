import emailjs from '@emailjs/browser';

// EmailJS configuration
// You'll need to replace these with your actual EmailJS credentials
// Get them from: https://www.emailjs.com/
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_SCHEDULE_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_SCHEDULE_TEMPLATE_ID || 'template_jwm6up9';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

interface InterviewEmailParams {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  recruiterName?: string;
}

interface ScheduledInterviewEmailParams {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  recruiterName?: string;
  interviewTitle: string;
  interviewDate: string; // e.g., "Monday, November 20, 2025"
  interviewTime: string; // e.g., "2:00 PM EST"
  meetingLink: string;
  interviewDescription?: string;
}

/**
 * Send scheduled interview email to candidate
 */
export const sendScheduledInterviewEmail = async (params: ScheduledInterviewEmailParams): Promise<boolean> => {
  try {
    console.log('📧 Sending scheduled interview email to:', params.candidateEmail);
    
    // Initialize EmailJS (only needed once)
    emailjs.init(EMAILJS_PUBLIC_KEY);
    
    // Prepare email template parameters
    const templateParams = {
      to_name: params.candidateName,
      to_email: params.candidateEmail,
      job_title: params.jobTitle,
      company_name: params.companyName,
      recruiter_name: params.recruiterName || 'the hiring team',
      interview_title: params.interviewTitle,
      interview_date: params.interviewDate,
      interview_time: params.interviewTime,
      meeting_link: params.meetingLink,
      interview_description: params.interviewDescription || '',
      message: `Your interview for ${params.jobTitle} at ${params.companyName} has been scheduled for ${params.interviewDate} at ${params.interviewTime}.`,
    };

    // Send email using EmailJS with the schedule template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_SCHEDULE_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('✅ Scheduled interview email sent successfully!');
      return true;
    } else {
      console.error('❌ Failed to send email:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending scheduled interview email:', error);
    return false;
  }
};

/**
 * Send interview invitation email to candidate
 */
export const sendInterviewInvitationEmail = async (params: InterviewEmailParams): Promise<boolean> => {
  try {
    console.log('📧 Sending interview invitation email to:', params.candidateEmail);
    
    // Initialize EmailJS (only needed once)
    emailjs.init(EMAILJS_PUBLIC_KEY);
    
    // Prepare email template parameters
    const templateParams = {
      to_name: params.candidateName,
      to_email: params.candidateEmail,
      job_title: params.jobTitle,
      company_name: params.companyName,
      recruiter_name: params.recruiterName || 'the hiring team',
      message: `Congratulations! Your application for the position of ${params.jobTitle} at ${params.companyName} has been shortlisted for an interview.`,
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('✅ Interview invitation email sent successfully!');
      return true;
    } else {
      console.error('❌ Failed to send email:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending interview invitation email:', error);
    return false;
  }
};

/**
 * Send multiple interview invitation emails
 */
export const sendBulkInterviewInvitations = async (
  candidates: InterviewEmailParams[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const sent = await sendInterviewInvitationEmail(candidate);
    if (sent) {
      success++;
    } else {
      failed++;
    }
    
    // Add a small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success, failed };
};

export default {
  sendInterviewInvitationEmail,
  sendBulkInterviewInvitations,
  sendScheduledInterviewEmail,
};
