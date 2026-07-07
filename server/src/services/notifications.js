// ============================================================
// Antigravity Model — Mock Notification Service
// Replace with real Twilio & SendGrid integrations in production
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
  // If SMTP is not configured, fallback to mock console log
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

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"Aharada Education" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
    });

    console.log(`📧 Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error;
  }
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
