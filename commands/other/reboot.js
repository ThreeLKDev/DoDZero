const { Command } = require('discord.js-commando');

module.exports = class RebootCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'reboot',
      group: 'other',
      memberName: 'reboot',
      ownerOnly: true,
      description: 'Reboot, duh.',
    });
  }

  run() {
    process.kill( process.pid );
  }
};
