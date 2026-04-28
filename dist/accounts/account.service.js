"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = __importDefault(require("../config.json"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const send_email_1 = __importDefault(require("../_helpers/send-email"));
const db_1 = __importDefault(require("../_helpers/db"));
const role_1 = __importDefault(require("../_helpers/role"));
exports.default = {
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
async function authenticate({ email, password, ipAddress }) {
    const account = await db_1.default.Account.scope('withHash').findOne({ where: { email } });
    if (!account || !account.isVerified || !(await bcryptjs_1.default.compare(password, account.passwordHash))) {
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
async function refreshToken({ token, ipAddress }) {
    const refreshToken = await db_1.default.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive)
        throw 'Invalid token';
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
async function revokeToken({ token, ipAddress }) {
    const refreshToken = await db_1.default.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive)
        throw 'Invalid token';
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}
async function register(params, origin) {
    if (await db_1.default.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    // First account gets Admin role, rest get User (as PDF says)
    const accountCount = await db_1.default.Account.count();
    const role = accountCount === 0 ? role_1.default.Admin : role_1.default.User;
    // Build the account without saving, so we can set the password hash first
    const account = db_1.default.Account.build({
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
async function verifyEmail(params) {
    const account = await db_1.default.Account.findOne({ where: { verificationToken: params.token } });
    if (!account)
        throw 'Verification failed';
    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}
async function forgotPassword(params, origin) {
    const account = await db_1.default.Account.findOne({ where: { email: params.email } });
    if (!account)
        return;
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();
    await sendPasswordResetEmail(account, origin);
}
async function validateResetToken(params) {
    const account = await db_1.default.Account.findOne({
        where: {
            resetToken: params.token,
            resetTokenExpires: { [sequelize_1.Op.gt]: Date.now() }
        }
    });
    if (!account)
        throw 'Invalid token';
    return account;
}
async function resetPassword(params) {
    const account = await validateResetToken({ token: params.token });
    account.passwordHash = await hash(params.password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    await account.save();
}
async function getAll() {
    const accounts = await db_1.default.Account.findAll();
    return accounts.map((x) => basicDetails(x));
}
async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}
async function create(params) {
    if (await db_1.default.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    const account = db_1.default.Account.build(params);
    account.verified = Date.now();
    account.passwordHash = await hash(params.password);
    await account.save();
    return basicDetails(account);
}
async function update(id, params) {
    const account = await getAccount(id);
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }
    Object.assign(account, params);
    await account.save();
    return basicDetails(account);
}
async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}
// helper functions
async function getAccount(id) {
    const account = await db_1.default.Account.findByPk(id);
    if (!account)
        throw 'Account not found';
    return account;
}
function randomTokenString() {
    return crypto_1.default.randomBytes(40).toString('hex');
}
async function hash(password) {
    return await bcryptjs_1.default.hash(password, 10);
}
function generateJwtToken(account) {
    return jsonwebtoken_1.default.sign({ sub: account.id, id: account.id }, config_json_1.default.jwtSecret, { expiresIn: '15m' });
}
async function generateRefreshToken(account, ipAddress) {
    return await db_1.default.RefreshToken.create({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: ipAddress
    });
}
function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}
async function sendVerificationEmail(account, origin) {
    const verifyUrl = `${origin}/accounts/verify-email?token=${account.verificationToken}`;
    const message = `<p>Please click the link below to verify your email address:</p>
                     <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    await (0, send_email_1.default)({ to: account.email, subject: 'Verify Email', html: message });
}
async function sendPasswordResetEmail(account, origin) {
    const resetUrl = `${origin}/accounts/reset-password?token=${account.resetToken}`;
    const message = `<p>Please click the link below to reset your password:</p>
                     <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    await (0, send_email_1.default)({ to: account.email, subject: 'Reset Password', html: message });
}
