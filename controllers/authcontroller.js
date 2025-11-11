// controllers/authController.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const transporter = require('../config/email');
const { User, Tenant } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 🔹 REGISTER (send verification email)
exports.register = async (req, res) => {
  try {
    const { businessName, contactPerson, whatsappNumber, businessType, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const tenant = await Tenant.create({
      businessName,
      contactPerson,
      whatsappNumber,
      businessType
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      email,
      password,
      tenantId: tenant.id,
      verificationToken
    });

    const token = generateToken(user)

    // const verifyUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

    // // await transporter.sendMail({
    // //   from: `"Rora" <${process.env.SMTP_USER}>`,
    // //   to: email,
    // //   subject: 'Verify your Rora account',
    // //   html: `<p>Welcome to Rora 🎉</p><p>Click below to verify your account:</p>
    // //          <a href="${verifyUrl}">${verifyUrl}</a>`
    // // });


    res.status(201).json({
      success: true,
      message: 'Verification email sent to ' + email,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          id: tenant.id,
          businessName: tenant.businessName,
          contactPerson: tenant.contactPerson,
          businessType: tenant.businessType
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// 🔹 VERIFY EMAIL
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { verificationToken: token } });

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    const tenant = await Tenant.findByPk(user.tenantId);
    if (tenant) {
      tenant.status = "active";
      await tenant.save();
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// 🔹 LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email }, include: 'tenant' });
    if (!user) return res.status(404).json({ error: 'Invalid credentials' });

    // if (!user.isVerified)
    //   return res.status(401).json({ error: 'Please verify your email before logging in' });

    const isValid = await user.validatePassword(password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, tenant: user.tenant }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// 🔹 FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No user with that email' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.BASE_URL}/auth/reset/${token}`;

    await transporter.sendMail({
      from: `"Rora" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset your Rora password',
      html: `<p>Click below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
    });

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};

// 🔹 RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
