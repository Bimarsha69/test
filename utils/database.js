const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        // Ensure database directory exists
        const dbPath = path.join(process.env.DB_PATH || './database');
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }

        // Initialize databases
        this.premiumDB = new Database(path.join(dbPath, 'premium.db'));
        this.usersDB = new Database(path.join(dbPath, 'users.db'));

        this.initializeTables();
    }

    initializeTables() {
        // Premium users table
        this.premiumDB.exec(`
            CREATE TABLE IF NOT EXISTS premium_users (
                user_id TEXT PRIMARY KEY,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                granted_by TEXT,
                active BOOLEAN DEFAULT TRUE
            )
        `);

        // User settings table
        this.usersDB.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                minecraft_username TEXT,
                server_ip TEXT,
                is_premium BOOLEAN DEFAULT FALSE,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Premium codes table
        this.premiumDB.exec(`
            CREATE TABLE IF NOT EXISTS premium_codes (
                code TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                used_by TEXT,
                used_at TIMESTAMP,
                active BOOLEAN DEFAULT TRUE
            )
        `);
    }

    // Premium user methods
    addPremiumUser(userId, grantedBy) {
        const stmt = this.premiumDB.prepare('INSERT OR REPLACE INTO premium_users (user_id, granted_by, active) VALUES (?, ?, TRUE)');
        return stmt.run(userId, grantedBy);
    }

    removePremiumUser(userId) {
        const stmt = this.premiumDB.prepare('UPDATE premium_users SET active = FALSE WHERE user_id = ?');
        return stmt.run(userId);
    }

    isPremiumUser(userId) {
        const stmt = this.premiumDB.prepare('SELECT active FROM premium_users WHERE user_id = ?');
        const result = stmt.get(userId);
        return result ? result.active : false;
    }

    listPremiumUsers() {
        const stmt = this.premiumDB.prepare('SELECT * FROM premium_users WHERE active = TRUE');
        return stmt.all();
    }

    // User settings methods
    updateUserSettings(userId, settings) {
        const stmt = this.usersDB.prepare(`
            INSERT OR REPLACE INTO user_settings (
                user_id, minecraft_username, server_ip, is_premium, last_active
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        return stmt.run(
            userId,
            settings.minecraft_username,
            settings.server_ip,
            settings.is_premium
        );
    }

    getUserSettings(userId) {
        const stmt = this.usersDB.prepare('SELECT * FROM user_settings WHERE user_id = ?');
        return stmt.get(userId);
    }

    // Premium codes methods
    generatePremiumCode(createdBy) {
        const code = Math.random().toString(36).substring(2, 15).toUpperCase();
        const stmt = this.premiumDB.prepare('INSERT INTO premium_codes (code, created_by) VALUES (?, ?)');
        stmt.run(code, createdBy);
        return code;
    }

    usePremiumCode(code, userId) {
        const stmt = this.premiumDB.prepare(`
            UPDATE premium_codes 
            SET used_by = ?, used_at = CURRENT_TIMESTAMP, active = FALSE 
            WHERE code = ? AND active = TRUE AND used_by IS NULL
        `);
        const result = stmt.run(userId, code);
        return result.changes > 0;
    }
}

module.exports = new DatabaseManager();