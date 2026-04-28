"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = model;
const sequelize_1 = require("sequelize");
function model(sequelize) {
    const attributes = {
        token: { type: sequelize_1.DataTypes.STRING },
        expires: { type: sequelize_1.DataTypes.DATE },
        created: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW },
        createdByIp: { type: sequelize_1.DataTypes.STRING },
        revoked: { type: sequelize_1.DataTypes.DATE },
        revokedByIp: { type: sequelize_1.DataTypes.STRING },
        replacedByToken: { type: sequelize_1.DataTypes.STRING },
        isExpired: {
            type: sequelize_1.DataTypes.VIRTUAL,
            get() { return Date.now() >= this.expires; }
        },
        isActive: {
            type: sequelize_1.DataTypes.VIRTUAL,
            get() { return !this.revoked && !this.isExpired; }
        }
    };
    const options = {
        timestamps: false
    };
    return sequelize.define('refreshToken', attributes, options);
}
