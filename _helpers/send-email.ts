import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function sendEmail({ to, subject, html, from = 'onboarding@resend.dev' }: any) {
    console.log('=== EMAIL DEBUG ===');
    console.log('To:', to);
    console.log('From:', from);
    console.log('===================');
    
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    
    if (error) {
        console.error('Email error:', error);
        throw error;
    }
    
    console.log('Email sent successfully:', data?.id);
}