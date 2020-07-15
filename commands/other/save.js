const { Command } = require('discord.js-commando');
const fs = require('fs');
module.exports = class SaveCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'save',
      memberName: 'save',
      group: 'other',
      description: 'Write session data ( watched channels ) to file.',
      guildOnly: true
    });
  }

  async run(message) {
    const guildData = {
      "text" : message.guild.channelWatch.text,
      "voice" : message.guild.channelWatch.voice
    }
    message.say('Let me write that down...');
    const data = JSON.stringify(guildData, null, 4);
    fs.writeFile(`./guilds/${message.guild.id}/guild.json`, data, (err) => {
      if(err) throw err;
      message.say('Done.');
    });
  }

};
