const config = require('../config.json');
const db = require('./database');

class PermissionManager {
    static isOwner(userId) {
        return userId === process.env.OWNER_ID;
    }

    static async hasRole(member, roleName) {
        try {
            return member.roles.cache.some(role => 
                role.name.toLowerCase() === roleName.toLowerCase()
            );
        } catch (err) {
            console.error('Error checking role:', err);
            return false;
        }
    }

    static async isAdmin(member) {
        if (this.isOwner(member.id)) return true;
        return this.hasRole(member, config.roles.admin);
    }

    static async isStaff(member) {
        if (await this.isAdmin(member)) return true;
        return this.hasRole(member, config.roles.staff);
    }

    static async isPremium(userId) {
        try {
            return db.isPremiumUser(userId);
        } catch (err) {
            console.error('Error checking premium status:', err);
            return false;
        }
    }

    static async canManageBots(member, currentBotCount = 0) {
        // Owner and admins can manage unlimited bots
        if (await this.isAdmin(member)) return true;

        // Premium users can have more than one bot
        if (await this.isPremium(member.id)) return true;

        // Regular users can only have one bot
        return currentBotCount === 0;
    }

    static async checkPermission(member, requiredPermission) {
        switch (requiredPermission) {
            case 'OWNER':
                return this.isOwner(member.id);
            case 'ADMIN':
                return this.isAdmin(member);
            case 'STAFF':
                return this.isStaff(member);
            case 'PREMIUM':
                return this.isPremium(member.id);
            default:
                return false;
        }
    }

    static getPermissionLevel(member) {
        if (this.isOwner(member.id)) return 4; // Owner
        if (this.isAdmin(member)) return 3;    // Admin
        if (this.isStaff(member)) return 2;    // Staff
        if (this.isPremium(member.id)) return 1; // Premium
        return 0; // Regular user
    }

    static async validateCommand(member, command) {
        const permLevel = await this.getPermissionLevel(member);

        // Define minimum permission levels for different command categories
        const minLevels = {
            owner: 4,
            admin: 3,
            staff: 2,
            premium: 1,
            general: 0
        };

        // Get the command category from the command name or path
        const category = command.category || 'general';
        return permLevel >= minLevels[category];
    }
}

module.exports = PermissionManager;