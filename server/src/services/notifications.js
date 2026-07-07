// ============================================================
// Aharada Education — Notification Service
// Email via Gmail SMTP (port 465 SSL — works on Render Free Tier)
// OR Google Apps Script Proxy (set GOOGLE_SCRIPT_URL env var)
// ============================================================

/**
 * Mock SMS sender (Twilio replacement)
 * Logs to console — ready for API key integration
 */
function sendSMS(to, message) {
  console.log('\n📱 ═══════════════════════════════════════════');
  console.log('   MOCK TWILIO SMS NOTIFICATION');
  console.log('═══════════════════════════════════════════════');
  console.log(`   To:      ${to}`);
  console.log(`   Message: ${message}`);
  console.log('═══════════════════════════════════════════════\n');
  
  // Production: Replace with actual Twilio call
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // return twilio.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: to,
  // });
  
  return Promise.resolve({ sid: 'MOCK_SMS_' + Date.now(), status: 'sent' });
}

const nodemailer = require('nodemailer');

/**
 * SendEmail using Nodemailer
 */
async function sendEmail(to, subject, body) {
  // 1. If Google Apps Script proxy is configured (Bypasses Render SMTP Block)
  if (process.env.GOOGLE_SCRIPT_URL) {
    try {
      const url = new URL(process.env.GOOGLE_SCRIPT_URL);
      url.searchParams.append('to', to);
      url.searchParams.append('subject', subject);
      url.searchParams.append('body', body);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Google Script returned error');
      console.log(`📧 Email sent successfully via Google Proxy to ${to}`);
      return { messageId: 'GOOGLE_PROXY_' + Date.now(), status: 'delivered' };
    } catch (error) {
      console.error(`❌ Google Proxy email failed:`, error.message);
      return { messageId: 'FAILED_PROXY', status: 'failed' };
    }
  }

  // 2. If no SMTP is configured at all
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n📧 ═══════════════════════════════════════════');
    console.log('   MOCK EMAIL NOTIFICATION (SMTP NOT CONFIGURED)');
    console.log('═══════════════════════════════════════════════');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${body}`);
    console.log('═══════════════════════════════════════════════\n');
    return Promise.resolve({ messageId: 'MOCK_EMAIL_' + Date.now(), status: 'delivered' });
  }

  // 3. Nodemailer via Gmail port 465 SSL (works on Render Free Tier)
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for port 465 (SSL) — Render allows this port
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const info = await transporter.sendMail({
      from: `"Aharada Education" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
      html: wrapHtml(body, subject),
    });

    console.log(`📧 Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    // Return resolved so app doesn't crash — check logs for failures
    return { messageId: 'FAILED_SMTP', status: 'failed' };
  }
}

/**
 * Wrap plain text in a branded HTML email template
 */
function wrapHtml(text, subject) {
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6B4FBB 0%,#4F8BDA 100%);padding:28px 36px;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Aharada Education</h1>
            <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Student Grievance & Task Portal</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <h2 style="color:#1a1a2e;font-size:17px;margin:0 0 16px;">${subject}</h2>
            <p style="color:#444;font-size:15px;line-height:1.75;margin:0;">${safeText}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fc;padding:18px 36px;border-top:1px solid #eee;text-align:center;">
            <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} Aharada Education. This is an automated message — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Notify HOD of a new student submission
 */
async function notifyHODNewSubmission(hodUser, studentName, taskId) {
  const subject = `New Student Request #${taskId}`;
  const message = `A new grievance has been submitted by ${studentName} (Task #${taskId}). Please review and assign it to a faculty member.`;
  
  await sendEmail(hodUser.email, subject, message);
  if (hodUser.phone) await sendSMS(hodUser.phone, message);
}

/**
 * Notify Student that their task has been assigned
 */
async function notifyStudentAssignment(studentUser, facultyName, taskId) {
  const subject = `Your Request #${taskId} Has Been Assigned`;
  const message = `Your request has been reviewed by the HOD and assigned to Prof. ${facultyName}. You will be notified of further updates.`;
  
  await sendEmail(studentUser.email, subject, message);
  if (studentUser.phone) await sendSMS(studentUser.phone, message);
}

/**
 * Notify Faculty of a new task assignment
 */
async function notifyFacultyAssignment(facultyUser, taskId) {
  const subject = `New Task Assigned: #${taskId}`;
  const message = `A new student task (#${taskId}) has been assigned to you by the HOD. Please review it at your earliest convenience.`;
  
  await sendEmail(facultyUser.email, subject, message);
  if (facultyUser.phone) await sendSMS(facultyUser.phone, message);
}

/**
 * Notify Student that their task has been resolved
 */
async function notifyStudentResolution(studentUser, facultyName, taskId, remark) {
  const subject = `Your Request #${taskId} Has Been Resolved`;
  let message = `Your problem has been marked as Resolved by Prof. ${facultyName}.\n\n`;
  if (remark) {
    message += `Faculty Remark: "${remark}"\n\n`;
  }
  message += `If you have any further concerns, please submit a new request.`;
  
  await sendEmail(studentUser.email, subject, message);
  if (studentUser.phone) await sendSMS(studentUser.phone, message);
}

/**
 * Notify Student of any general update or remark
 */
async function notifyStudentTaskUpdate(studentUser, facultyName, taskId, status, remark) {
  const subject = `Update on Your Request #${taskId}`;
  let message = `Prof. ${facultyName} has updated your request (#${taskId}).\n\n`;
  if (status) message += `New Status: ${status}\n`;
  if (remark) message += `Remark: "${remark}"\n\n`;
  message += `Please log in to the portal to view the full details.`;
  
  await sendEmail(studentUser.email, subject, message);
  if (studentUser.phone) await sendSMS(studentUser.phone, message);
}

/**
 * Notify HOD that a task has been resolved
 */
async function notifyHODResolution(hodUser, facultyName, taskId) {
  const subject = `Task #${taskId} Resolved`;
  const message = `Task ID #${taskId} has been successfully resolved by Prof. ${facultyName}.`;
  
  await sendEmail(hodUser.email, subject, message);
  if (hodUser.phone) await sendSMS(hodUser.phone, message);
}

/**
 * Notify HOD of a general task update or internal remark
 */
async function notifyHODTaskUpdate(hodUser, facultyName, taskId, status, remarkHod) {
  const subject = `Update on Task #${taskId}`;
  let message = `Prof. ${facultyName} has updated task #${taskId}.\n\n`;
  if (status) message += `New Status: ${status}\n`;
  if (remarkHod) message += `Internal Faculty Remark: "${remarkHod}"\n\n`;
  message += `Please log in to the portal to view the full details.`;
  
  await sendEmail(hodUser.email, subject, message);
  if (hodUser.phone) await sendSMS(hodUser.phone, message);
}

module.exports = {
  sendSMS,
  sendEmail,
  notifyHODNewSubmission,
  notifyStudentAssignment,
  notifyFacultyAssignment,
  notifyStudentResolution,
  notifyStudentTaskUpdate,
  notifyHODResolution,
  notifyHODTaskUpdate,
};
