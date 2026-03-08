import emailjs from '@emailjs/browser';

// Replace with your actual EmailJS credentials
const SERVICE_ID = 'service_cmu8v2y';
const TEMPLATE_ID = 'template_7yzhvk9';
const PUBLIC_KEY = 'SFDLvtE8EBGra5qM0';


export const sendInterviewEmail = async (candidateName: string, candidateEmail: string, jobTitle: string, interviewDate: string, interviewTime: string, meetingLink: string) => {
    try {
        const templateParams = {
            to_name: candidateName,
            to_email: candidateEmail,
            job_title: jobTitle,
            interview_date: interviewDate,
            interview_time: interviewTime,
            meeting_link: meetingLink,
            message: `You have been invited to an interview for the ${jobTitle} position.`
        };

        const response = await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || SERVICE_ID,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || TEMPLATE_ID,
            templateParams,
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || PUBLIC_KEY
        );

        console.log('Email sent successfully!', response.status, response.text);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};
