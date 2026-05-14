import config from '../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

initialize();

async function initialize() {
    const host = process.env.DB_HOST!;
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER!;
    const password = process.env.DB_PASSWORD!;
    const database = process.env.DB_DATABASE!;
    
    const connection = await mysql.createConnection({ host, port, user, password });

    // Create DB if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();

    // Connect to DB
    const sequelize = new Sequelize(database, user, password, { 
    dialect: 'mysql',
    host,
    port
    });

    // Init models
    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);

    // Define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // Sync models with database
    await sequelize.sync();
}