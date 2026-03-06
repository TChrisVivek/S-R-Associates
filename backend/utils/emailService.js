const nodemailer = require('nodemailer');

/**
 * Send email using either Resend HTTP API (for deployed environments where SMTP is blocked)
 * or nodemailer SMTP (for localhost development).
 *
 * Set RESEND_API_KEY env var on Render to use Resend.
 * If not set, falls back to SMTP (works on localhost).
 */

/**
 * Send an email invitation to a new client
 * @param {string} toEmail - The client's email address
 * @param {string} projectName - The name of the project they are assigned to
 * @param {string|null} companyLogoUrl - Optional dynamic company logo URL
 * @param {string} projectImageUrl - URL of the project's cover image
 * @param {Object} companyInfo - Dynamic company info from Settings
 */
const sendClientInviteEmail = async (toEmail, projectName, companyLogoUrl = null, projectImageUrl = "https://images.unsplash.com/photo-1541888081622-4a0048af98ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", companyInfo = {}) => {
    try {
        const clientUrl = process.env.CLIENT_URL || 'https://s-r-associates.vercel.app';
        const loginUrl = `${clientUrl}`;

        // Dynamic company details with fallbacks
        const companyName = companyInfo.name || 'S-R Associates';
        const companyAddress = companyInfo.address || '342, Nijalingappa Layout, Davanagere, Karnataka 577004';

        // Top black header logo block
        const topLogoBlock = companyLogoUrl
            ? `
                <div style="background-color: #111827; padding: 24px; text-align: center;">
                    <a href="${clientUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
                        <img src="${companyLogoUrl}" alt="Company Logo" border="0" style="max-height: 50px; max-width: 200px; object-fit: contain; display: block; outline: none; text-decoration: none; margin: 0 auto;" />
                    </a>
                </div>
            `
            : `
                <div style="background-color: #111827; padding: 24px; text-align: center;">
                    <a href="${clientUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
                        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); width: 44px; height: 44px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                            <span style="color: white; font-weight: 800; font-size: 20px; letter-spacing: -1px; display: block; line-height: 44px;">SR</span>
                        </div>
                    </a>
                </div>
            `;

        const htmlBody = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 0; min-height: 100vh;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                    
                    ${topLogoBlock}

                    <a href="${loginUrl}" target="_blank" style="display: block; width: 100%; height: 240px; background-color: #e5e7eb; overflow: hidden; text-decoration: none;">
                        <img src="${projectImageUrl}" alt="Project Cover" border="0" style="width: 100%; height: 100%; object-fit: cover; display: block; outline: none; text-decoration: none;" />
                    </a>
                    
                    <div style="padding: 48px 40px; text-align: center;">
                        <h1 style="font-family: 'Georgia', serif; font-size: 28px; color: #111827; margin: 0 0 16px 0; font-weight: normal; line-height: 1.3;">
                            You're invited to the<br/>Project Workspace
                        </h1>
                        
                        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                            You have been granted secure access to oversee the<br/>
                            progress of the <strong>${projectName}</strong> development project.
                        </p>
                        
                        <a href="${loginUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 13px; font-weight: 600; padding: 16px 32px; text-decoration: none; letter-spacing: 0.5px; margin-bottom: 24px;">
                            ACCESS PROJECT DASHBOARD
                        </a>
                        
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            Please sign in with <strong>${toEmail}</strong> via Google SSO.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px auto; width: 80%;" />
                        
                        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 24px;">WHAT'S INSIDE</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                            <tr>
                                <td align="center" width="33%">
                                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid #e5e7eb; display: inline-block; vertical-align: middle; margin-bottom: 12px;">
                                        <img src="https://img.icons8.com/ios/50/6b7280/camera--v1.png" width="22" height="22" style="display: block; opacity: 0.6; margin: 13px auto;" />
                                    </div>
                                    <p style="font-size: 10px; font-weight: 600; color: #4b5563; margin: 0; letter-spacing: 0.5px; text-transform: uppercase;">LIVE PHOTOS</p>
                                </td>
                                <td align="center" width="33%">
                                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid #e5e7eb; display: inline-block; vertical-align: middle; margin-bottom: 12px;">
                                        <img src="https://img.icons8.com/ios/50/6b7280/document--v1.png" width="20" height="20" style="display: block; opacity: 0.6; margin: 14px auto;" />
                                    </div>
                                    <p style="font-size: 10px; font-weight: 600; color: #4b5563; margin: 0; letter-spacing: 0.5px; text-transform: uppercase;">DAILY LOGS</p>
                                </td>
                                <td align="center" width="33%">
                                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid #e5e7eb; display: inline-block; vertical-align: middle; margin-bottom: 12px;">
                                        <img src="https://img.icons8.com/ios/50/6b7280/box--v1.png" width="22" height="22" style="display: block; opacity: 0.6; margin: 13px auto;" />
                                    </div>
                                    <p style="font-size: 10px; font-weight: 600; color: #4b5563; margin: 0; letter-spacing: 0.5px; text-transform: uppercase;">INVENTORY</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 32px;">
                    <p style="color: #9ca3af; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">${companyName.toUpperCase()} CONSTRUCTION MANAGEMENT</p>
                    <p style="color: #9ca3af; font-size: 11px; margin: 0 0 24px 0;">${companyAddress}</p>
                    
                    <p style="font-size: 10px; color: #9ca3af; line-height: 2;">
                        <a href="#" style="color: #9ca3af; text-decoration: none; font-weight: 600; text-transform: uppercase;">TERMS OF SERVICE</a> &nbsp;&nbsp;&nbsp;&nbsp; 
                        <a href="#" style="color: #9ca3af; text-decoration: none; font-weight: 600; text-transform: uppercase;">PRIVACY POLICY</a> &nbsp;&nbsp;&nbsp;&nbsp; 
                        <a href="#" style="color: #9ca3af; text-decoration: none; font-weight: 600; text-transform: uppercase;">CONTACT SUPPORT</a>
                    </p>
                    
                    <p style="color: #d1d5db; font-size: 10px; margin-top: 24px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                </div>
            </div>
            `;

        const subject = `Welcome to ${projectName} — ${companyName}`;
        const fromName = `${companyName} Portal`;
        const fromEmail = process.env.SMTP_USER || 'no-reply@sr-associates.com';

        // ── METHOD 1: Resend HTTP API (works on Render / all cloud platforms) ──
        if (process.env.RESEND_API_KEY) {
            console.log('[Email] Using Resend HTTP API...');

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `${fromName} <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`,
                    to: [toEmail],
                    subject: subject,
                    html: htmlBody,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('[Email] Resend API error:', result);
                return false;
            }

            console.log('[Email] Email sent via Resend:', result.id);
            return true;
        }

        // ── METHOD 2: SMTP via Nodemailer (works on localhost) ──
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ No email credentials configured (RESEND_API_KEY or SMTP_USER/SMTP_PASS). Email NOT sent.');
            return true;
        }

        console.log('[Email] Using SMTP (localhost mode)...');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: htmlBody,
        });

        console.log("[Email] Email sent via SMTP:", info.messageId);
        return true;

    } catch (error) {
        console.error("[Email] Error sending invite email:", error.message);
        console.error("[Email] Full error:", error);
        return false;
    }
};

module.exports = {
    sendClientInviteEmail
};
