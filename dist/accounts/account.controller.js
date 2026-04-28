"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const joi_1 = __importDefault(require("joi"));
const validate_request_1 = __importDefault(require("../_middleware/validate-request"));
const authorize_1 = __importDefault(require("../_middleware/authorize"));
const role_1 = __importDefault(require("../_helpers/role"));
const account_service_1 = __importDefault(require("./account.service"));
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', (0, authorize_1.default)(), revokeTokenSchema, revokeToken);
router.post('/register', registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.get('/', (0, authorize_1.default)(role_1.default.Admin), getAll);
router.get('/:id', (0, authorize_1.default)(), getById);
router.post('/', (0, authorize_1.default)(role_1.default.Admin), createSchema, create);
router.put('/:id', (0, authorize_1.default)(), updateSchema, update);
router.delete('/:id', (0, authorize_1.default)(), _delete);
exports.default = router;
// schema & route functions
function authenticateSchema(req, res, next) {
    const schema = joi_1.default.object({
        email: joi_1.default.string().required(),
        password: joi_1.default.string().required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function authenticate(req, res, next) {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    account_service_1.default.authenticate({ email, password, ipAddress })
        .then(({ refreshToken, ...account }) => {
        setTokenCookie(res, refreshToken);
        res.json(account);
    })
        .catch(next);
}
function refreshToken(req, res, next) {
    const token = req.cookies.refreshToken;
    const ipAddress = req.ip;
    account_service_1.default.refreshToken({ token, ipAddress })
        .then(({ refreshToken, ...account }) => {
        setTokenCookie(res, refreshToken);
        res.json(account);
    })
        .catch(next);
}
function revokeTokenSchema(req, res, next) {
    const schema = joi_1.default.object({
        token: joi_1.default.string().empty('')
    });
    (0, validate_request_1.default)(req, next, schema);
}
function revokeToken(req, res, next) {
    const token = req.body.token || req.cookies.refreshToken;
    const ipAddress = req.ip;
    if (!token)
        return res.status(400).json({ message: 'Token is required' });
    if (!req.user.ownsToken(token) && req.user.role !== role_1.default.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    account_service_1.default.revokeToken({ token, ipAddress })
        .then(() => res.json({ message: 'Token revoked' }))
        .catch(next);
}
function registerSchema(req, res, next) {
    const schema = joi_1.default.object({
        title: joi_1.default.string().required(),
        firstName: joi_1.default.string().required(),
        lastName: joi_1.default.string().required(),
        email: joi_1.default.string().required(),
        password: joi_1.default.string().min(6).required(),
        confirmPassword: joi_1.default.string().valid(joi_1.default.ref('password')).required(),
        acceptTerms: joi_1.default.boolean().valid(true).required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function register(req, res, next) {
    account_service_1.default.register(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Registration successful, please check your email for verification instructions' }))
        .catch(next);
}
function verifyEmailSchema(req, res, next) {
    const schema = joi_1.default.object({
        token: joi_1.default.string().required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function verifyEmail(req, res, next) {
    account_service_1.default.verifyEmail(req.body)
        .then(() => res.json({ message: 'Verification successful, you can now login' }))
        .catch(next);
}
function forgotPasswordSchema(req, res, next) {
    const schema = joi_1.default.object({
        email: joi_1.default.string().email().required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function forgotPassword(req, res, next) {
    account_service_1.default.forgotPassword(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
        .catch(next);
}
function validateResetTokenSchema(req, res, next) {
    const schema = joi_1.default.object({
        token: joi_1.default.string().required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function validateResetToken(req, res, next) {
    account_service_1.default.validateResetToken(req.body)
        .then(() => res.json({ message: 'Token is valid' }))
        .catch(next);
}
function resetPasswordSchema(req, res, next) {
    const schema = joi_1.default.object({
        token: joi_1.default.string().required(),
        password: joi_1.default.string().min(6).required(),
        confirmPassword: joi_1.default.string().valid(joi_1.default.ref('password')).required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function resetPassword(req, res, next) {
    account_service_1.default.resetPassword(req.body)
        .then(() => res.json({ message: 'Password reset successful, you can now login' }))
        .catch(next);
}
function getAll(req, res, next) {
    account_service_1.default.getAll()
        .then((accounts) => res.json(accounts))
        .catch(next);
}
function getById(req, res, next) {
    if (Number(req.params.id) !== req.user.id && req.user.role !== role_1.default.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    account_service_1.default.getById(req.params.id)
        .then((account) => account ? res.json(account) : res.sendStatus(404))
        .catch(next);
}
function createSchema(req, res, next) {
    const schema = joi_1.default.object({
        title: joi_1.default.string().required(),
        firstName: joi_1.default.string().required(),
        lastName: joi_1.default.string().required(),
        email: joi_1.default.string().email().required(),
        password: joi_1.default.string().min(6).required(),
        confirmPassword: joi_1.default.string().valid(joi_1.default.ref('password')).required(),
        role: joi_1.default.string().valid(role_1.default.Admin, role_1.default.User).required()
    });
    (0, validate_request_1.default)(req, next, schema);
}
function create(req, res, next) {
    account_service_1.default.create(req.body)
        .then((account) => res.json(account))
        .catch(next);
}
function updateSchema(req, res, next) {
    const schemaRules = {
        title: joi_1.default.string().empty(''),
        firstName: joi_1.default.string().empty(''),
        lastName: joi_1.default.string().empty(''),
        email: joi_1.default.string().email().empty(''),
        password: joi_1.default.string().min(6).empty(''),
        confirmPassword: joi_1.default.string().valid(joi_1.default.ref('password')).empty('')
    };
    if (req.user.role === role_1.default.Admin) {
        schemaRules.role = joi_1.default.string().valid(role_1.default.Admin, role_1.default.User).empty('');
    }
    const schema = joi_1.default.object(schemaRules).with('password', 'confirmPassword');
    (0, validate_request_1.default)(req, next, schema);
}
function update(req, res, next) {
    if (Number(req.params.id) !== req.user.id && req.user.role !== role_1.default.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    account_service_1.default.update(req.params.id, req.body)
        .then((account) => res.json(account))
        .catch(next);
}
function _delete(req, res, next) {
    if (Number(req.params.id) !== req.user.id && req.user.role !== role_1.default.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    account_service_1.default.delete(req.params.id)
        .then(() => res.json({ message: 'Account deleted successfully' }))
        .catch(next);
}
function setTokenCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    res.cookie('refreshToken', token, cookieOptions);
}
