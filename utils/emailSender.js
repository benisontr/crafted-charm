const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

const sendAdminNotification = async ({ name, email, subject, message }) => {
  const mailOptions = {
    from: `"Crafted Charm Contact" <${process.env.EMAIL}>`,
    to: process.env.EMAIL,
    subject: `New Contact Message: ${subject || "No Subject"}`,
    html: `
      <h3>New Message Received</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject || "N/A"}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendAdminNotification };
