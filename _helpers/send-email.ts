import nodemailer from 'nodemailer';

export default async function sendEmail({ to, subject, html, from }: any) {
    console.log('=== EMAIL DEBUG ===');
    console.log('To:', to);
    console.log('From:', from);
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP User:', process.env.SMTP_USER);
    console.log('===================');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    await transporter.sendMail({ from, to, subject, html });
    console.log('Email sent successfully');
}