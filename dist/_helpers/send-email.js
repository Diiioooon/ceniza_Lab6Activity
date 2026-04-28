"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_json_1 = __importDefault(require("../config.json"));
async function sendEmail({ to, subject, html, from = config_json_1.default.emailFrom }) {
    const transporter = nodemailer_1.default.createTransport(config_json_1.default.smtpOptions);
    await transporter.sendMail({ from, to, subject, html });
}
