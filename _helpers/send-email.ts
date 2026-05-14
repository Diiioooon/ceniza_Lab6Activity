export default async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }: any) {
    console.log('=== EMAIL DEBUG ===');
    console.log('To:', to);
    console.log('From:', from);
    console.log('===================');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY!
        },
        body: JSON.stringify({
            sender: { email: from },
            to: [{ email: to }],
            subject,
            htmlContent: html
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Email error:', error);
        throw new Error(JSON.stringify(error));
    }

    console.log('Email sent successfully');
}