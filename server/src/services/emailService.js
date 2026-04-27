const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

exports.sendOTP = async (email, otp) => {
    const mailOptions = {
        from: `"D-Vote Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🔒 Your D-Vote Verification Code',
        text: `Your verification code is: ${otp}. This code will expire in 5 minutes.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #6366f1; text-align: center;">D-Vote Identity Verification</h2>
                <p>Hello,</p>
                <p>You are receiving this email because a registration request was initiated on the D-Vote Network.</p>
                <div style="background: #f4f4f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #1e1e2e;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

exports.sendRegistrationSuccess = async (email, name) => {
    const mailOptions = {
        from: `"D-Vote Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🎉 Registration Successful - D-Vote Network',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #6366f1; text-align: center;">Welcome to D-Vote!</h2>
                <p>Hello ${name},</p>
                <p>Your registration request has been successfully received. While your identity details are being processed and verified by the network administrators, your account status is currently <strong>PENDING</strong>.</p>
                <p>You will receive another notification once your identity has been approved.</p>
                <div style="background: #f4f4f9; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <span style="color: #555;">Status: <strong style="color: #f59e0b;">PENDING</strong></span>
                </div>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

exports.sendApprovalNotification = async (email, name) => {
    const mailOptions = {
        from: `"D-Vote Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '✅ Identity Approved - D-Vote Network',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #22c55e; text-align: center;">Identity Verified!</h2>
                <p>Hello ${name},</p>
                <p>Congratulations! Your identity has been verified and approved by the network administrators. You now have full access to participate in elections.</p>
                <div style="background: #f0fdf4; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <span style="color: #166534;">Status: <strong style="color: #22c55e;">APPROVED</strong></span>
                </div>
                <p style="text-align: center;">
                    <a href="http://localhost:5173" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                </p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};
