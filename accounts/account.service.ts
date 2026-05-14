
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import sendEmail from '../_helpers/send-email';
import db from '../_helpers/db';
import Role from '../_helpers/role';

export default {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ email, password, ipAddress }: any) {
    const account = await db.Account.scope('withHash').findOne({ where: { email } });
    if (!account || !account.isVerified || !(await bcrypt.compare(password, account.passwordHash))) {
        throw 'Email or password is incorrect';
    }
    const jwtToken = generateJwtToken(account);
    const refreshToken = await generateRefreshToken(account, ipAddress);
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }: any) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    const account = await refreshToken.getAccount();
    const newRefreshToken = await generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    const jwtToken = generateJwtToken(account);
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }: any) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params: any, origin: string) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }

    // First account gets Admin role, rest get User (as PDF says)
    const accountCount = await db.Account.count();
    const role = accountCount === 0 ? Role.Admin : Role.User;

    // Build the account without saving, so we can set the password hash first
    const account = db.Account.build({
        title: params.title,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        acceptTerms: params.acceptTerms,
        role: role,
        verificationToken: randomTokenString()
    });

    // Hash the password and set it before saving
    account.passwordHash = await hash(params.password);
    await account.save();

    await sendVerificationEmail(account, origin);
    return basicDetails(account);
}

async function verifyEmail(params: any) {
    const account = await db.Account.findOne({ where: { verificationToken: params.token } });
    if (!account) throw 'Verification failed';
    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword(params: any, origin: string) {
    const account = await db.Account.findOne({ where: { email: params.email } });
    if (!account) return;
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24*60*60*1000);
    await account.save();
    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken(params: any) {
    const account = await db.Account.findOne({
        where: {
            resetToken: params.token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });
    if (!account) throw 'Invalid token';
    return account;
}

async function resetPassword(params: any) {
    const account = await validateResetToken({ token: params.token });
    account.passwordHash = await hash(params.password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map((x: any) => basicDetails(x));
}

async function getById(id: string) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params: any) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    const account = db.Account.build(params);
    account.verified = Date.now();
    account.passwordHash = await hash(params.password);
    await account.save();
    return basicDetails(account);
}

async function update(id: string, params: any) {
    const account = await getAccount(id);
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }
    Object.assign(account, params);
    await account.save();
    return basicDetails(account);
}

async function _delete(id: string) {
    const account = await getAccount(id);
    await account.destroy();
}

// helper functions

async function getAccount(id: string) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

async function hash(password: string) {
    return await bcrypt.hash(password, 10);
}

function generateJwtToken(account: any) {
    return jwt.sign({ sub: account.id, id: account.id }, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

async function generateRefreshToken(account: any, ipAddress: string) {
    return await db.RefreshToken.create({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7*24*60*60*1000),
        createdByIp: ipAddress
    });
}

function basicDetails(account: any) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

async function sendVerificationEmail(account: any, origin: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/account/verify-email?token=${account.verificationToken}`;
    const message = `<p>Please click the link below to verify your email address:</p>
                     <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    await sendEmail({ to: account.email, subject: 'Verify Email', html: message });
}

async function sendPasswordResetEmail(account: any, origin: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/account/reset-password?token=${account.resetToken}`;
    const message = `<p>Please click the link below to reset your password:</p>
                     <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    await sendEmail({ to: account.email, subject: 'Reset Password', html: message });
}