const nodemailer = require('nodemailer');

/* An explicit opt-out, so a run that means to be silent is not reported as a mistake */
const emailDisabled = process.env.EMAIL_DISABLED === '1' || process.env.EMAIL_DISABLED === 'true';

if (emailDisabled) {
  console.log('• Email sending is disabled for this run (EMAIL_DISABLED)');
} else if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  /* Without credentials every send fails quietly, so the problem is announced once at startup */
  console.error(
    '✗ EMAIL_USER / EMAIL_PASS are not set — registration and recovery emails ' +
    'will NOT send. Add them to your .env (see env.example for instructions).'
  );
}

let transporter = null;
let injected = false;

/* Created on first send, so importing this file never opens a connection on its own */
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/* Lets the tests drop in a stub, which is how no mail leaves the machine during a run */
const setTransporter = (replacement) => {
  transporter = replacement;
  injected = true;
};

/* With nothing to send through, the attempt is skipped rather than failing once per
   registration, since the missing configuration was already reported at startup */
const canSend = () =>
  !emailDisabled && (injected || (!!process.env.EMAIL_USER && !!process.env.EMAIL_PASS));

/* Gmail is asked to confirm the credentials now, rather than the first user finding out for us */
if (process.env.NODE_ENV !== 'test') {
  getTransporter().verify()
    .then(() => console.log('✓ Email transporter ready — credentials accepted by Gmail'))
    .catch(err => console.error('✗ Email transporter configuration error:', err.message));
}

/* Styles are inline because mail clients throw away stylesheets, and shared so both mails match */
const shell = (inner) => `
      <div style="font-family:Georgia,serif;background:#0d2438;color:#a5e1fc;padding:40px;border-radius:12px;max-width:480px;margin:auto;">
        ${inner}
        <p style="margin-top:32px;color:#9dd9fb;font-style:italic;">— The Puck team</p>
      </div>
    `;

const sendRegistrationEmail = async (toEmail) => {
  if (!canSend()) return;

  const mailOptions = {
    from: `"Puck" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome to Puck ✦',
    html: shell(`
        <h1 style="color:#9dd9fb;letter-spacing:0.08em;margin-bottom:8px;">Welcome to Puck</h1>
        <p style="font-style:italic;color:#8ad6fb;margin-bottom:24px;">Your journey begins.</p>
        <p style="line-height:1.7;">Your account has been created successfully. You can now log in and start building your first deck of flashcards.</p>
        <p style="line-height:1.7;margin-top:16px;">Create decks, study them your way, and let knowledge find its home.</p>`),
  };
  await getTransporter().sendMail(mailOptions);
};

const sendPasswordResetEmail = async (toEmail, code) => {
  if (!canSend()) return;

  const mailOptions = {
    from: `"Puck" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Puck recovery code ✦',
    html: shell(`
        <h1 style="color:#9dd9fb;letter-spacing:0.08em;margin-bottom:8px;">Password Reset</h1>
        <p style="font-style:italic;color:#8ad6fb;margin-bottom:24px;">A key to reclaim your account.</p>
        <p style="line-height:1.7;">Use the code below to reset your Puck password. It expires in 15 minutes.</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:0.3em;color:#9dd9fb;text-align:center;margin:28px 0;">${code}</div>
        <p style="line-height:1.7;">If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>`),
  };
  await getTransporter().sendMail(mailOptions);
};

module.exports = { sendRegistrationEmail, sendPasswordResetEmail, setTransporter };
