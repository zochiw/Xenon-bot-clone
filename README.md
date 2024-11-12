# Discord Server Backup Bot

A powerful Discord bot for creating and restoring server backups, developed by Ghost Planet.

## Features

- Complete server backup functionality
- Backup includes:
  - Channels (all types)
  - Categories
  - Roles
  - Emojis (both static and animated)
  - Stickers
- Proper handling of community features
- User-friendly status updates
- Secure backup restoration process

## Prerequisites

- Node.js v16.9.0 or higher
- Discord Bot Token
- Required Discord Bot Permissions:
  - Administrator (for complete backup functionality)

## Installation

1. Clone the repository
```bash
git clone https://github.com/friday2su/xenon-bot-clone.git
cd discord-backup-bot
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
- Rename `.env.example` to `.env`
- Fill in your bot token and client ID

4. Deploy slash commands
```bash
node deploy-commands.js
```

5. Start the bot
```bash
npm start
```

## Commands

### `/backup`
Creates a backup of the current server
- Generates a unique backup ID
- Stores all server components
- Requires Administrator permission

### `/load-backup`
Restores a server from a backup
- Requires backup ID
- Requires Administrator permission
- Will prompt for confirmation before proceeding

## Environment Variables

Create a `.env` file in the root directory with the following variables:
```env
TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

## Bot Invite Link

Replace `YOUR_CLIENT_ID` with your bot's client ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Support

Join our Discord server for support and updates:
[Ghost Planet Discord Server](https://discord.gg/zPjH55uCYt)

## Contributing

This project is open source under the MIT license. Contributions are welcome:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/friday2su/xenon-bot-clone/blob/main/LICENSE) file for details.

## Author

- **Friday** - *Initial work* - [Ghost Planet](https://discord.gg/zPjH55uCYt)

## Acknowledgments

- Thanks to the Discord.js team for their amazing library
- Special thanks to the Ghost Planet community

## Copyright

Copyright (c) 2024 Ghost Planet. All rights reserved. 
