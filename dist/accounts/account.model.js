"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = model;
const sequelize_1 = require("sequelize");
function model(sequelize) {
    const attributes = {
        email: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        passwordHash: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        firstName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        lastName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        acceptTerms: { type: sequelize_1.DataTypes.BOOLEAN },
        role: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        verificationToken: { type: sequelize_1.DataTypes.STRING },
        verified: { type: sequelize_1.DataTypes.DATE },
        resetToken: { type: sequelize_1.DataTypes.STRING },
        resetTokenExpires: { type: sequelize_1.DataTypes.DATE },
        passwordReset: { type: sequelize_1.DataTypes.DATE },
        created: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW },
        updated: { type: sequelize_1.DataTypes.DATE },
        isVerified: {
            type: sequelize_1.DataTypes.VIRTUAL,
            get() { return !!(this.verified || this.passwordReset); }
        }
    };
    const options = {
        timestamps: false,
        defaultScope: {
            attributes: { exclude: ['passwordHash'] }
        },
        scopes: {
            withHash: { attributes: {} }
        }
    };
    return sequelize.define('account', attributes, options);
}
