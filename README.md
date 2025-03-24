# Discord Minecraft Bot

A Discord bot that can join Minecraft servers with premium features, role-based permissions, and multi-guild support.

## Features

- Multi-Guild Support
- Minecraft Server Management (supports versions up to 1.20.2)
- Role-Based Permissions
- Premium System
- Admin and Staff Commands
- Owner-Only Commands

## Prerequisites

- Node.js 16.9.0 or higher
- Discord Bot Token
- Discord Application with slash commands enabled

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following content:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_application_id
   OWNER_ID=your_discord_user_id
   DB_PATH=./database
   ```
4. Deploy slash commands:
   ```bash
   npm run deploy
   ```
5. Start the bot:
   ```bash
   npm start
   ```

## Command Categories

### General Commands
- `/help` - Shows an interactive help menu with command categories
- `/ping` - Check bot latency and API response time

### Minecraft Commands
- `/join <ip> [port] [version]` - Make the bot join a server (supports versions 1.16.5 to 1.20.2)
- `/leave <username>` - Make the bot leave
- `/listplayers <username>` - Show online players with their gamemode and ping
- `/chat <username> <message>` - Send a chat message
- `/serverstatus <username>` - Check detailed server status

### Admin Commands
- `/addadmin <user>` - Grant admin role
- `/removeadmin <user>` - Remove admin role
- `/addstaff <user>` - Grant staff role
- `/removestaff <user>` - Remove staff role
- `/generatepremiumcode [amount] [note]` - Generate premium codes

### Staff Commands
- `/checkpremium <user>` - Check a user's premium status and details

### Owner Commands
- `/setstatus <type> <text>` - Change bot presence
- `/setbotavatar <image>` - Set bot avatar
- `/shutdown [reason]` - Safely shut down the bot

### Premium Commands
- `/addpremium <user> [code]` - Grant premium status
- `/removepremium <user> [reason]` - Remove premium status
- `/listpremiumusers` - Show all premium users with pagination

## Premium Features

- Multiple bot connections per user
- Custom bot usernames
- Premium-only features
- Automatic connection management
- Priority support

## Database Structure

The bot uses SQLite for data storage with two main databases:

### premium.db
- premium_users: Stores active premium users
- premium_codes: Manages premium code generation and usage

### users.db
- user_settings: Stores user preferences and Minecraft settings

## Role System

The bot uses a hierarchical role system:
1. Owner (Highest)
2. Admin
3. Staff
4. Premium Users
5. Regular Users (Lowest)

## Minecraft Integration

- Default bot username: "SoWre"
- Supports multiple Minecraft versions
- Automatic reconnection handling
- Chat message relay
- Player list monitoring
- Server status tracking

## Error Handling

- Comprehensive error logging
- User-friendly error messages
- Automatic cleanup on shutdown
- Database transaction safety
- Connection state management

## Logging System

The bot logs important events to:
- Console
- bot-logs channel (if available)
- premium-logs channel (for premium-related events)
- DM notifications for important events

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## Support

For support:
1. Check the help command
2. Review error messages
3. Contact server staff
4. Contact the bot owner through Discord

## Security Features

- Role-based access control
- Premium code validation
- Safe database transactions
- Protected owner commands
- Rate limiting on sensitive operations

## License

This project is licensed under the MIT License.