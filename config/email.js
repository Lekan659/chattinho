const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api", // must be literally "api"
    pass: "7b3923d029bb06a38324496af52a3cc0", // your token
  },
});

const sender = {
  address: "hello@demomailtrap.co",
  name: "Mailtrap Test",
};

module.exports = { transporter, sender };
