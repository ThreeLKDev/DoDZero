require('dotenv').config();
const { Command } = require('discord.js-commando');
const loader = require('../../loader.js');
const prefix = process.env.PREFIX;
const fs = require('fs');
module.exports = class ConfigCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'config',
      memberName: 'config',
      group: 'other',
      aliases: [ 'cfg' ],
      description: 'Save or reload guild session data.',
      guildOnly: true,
      args: [
        {
          key: 'action',
          prompt: `Usage: \`${prefix}config save\` or \`${prefix}config load\``,
          type: 'string'
        },
        {
          key: 'verbose',
          prompt: '',
          type: 'string',
          default: 'true',
        }
      ]
    });
  }
  async run(message, { action, verbose } ){
    action = action.toLowerCase();
    verbose = verbose.toLowerCase();
    let isVerbose = ( verbose === 'true' || verbose === 'verbose' );
    if( action === 'save' ) {
      const guildData = {
        'text' : message.guild.channelWatch.text,
        'voice' : message.guild.channelWatch.voice,
        'pixiv' : message.guild.channelWatch.pixiv
      }
      if( isVerbose )
        message.say('Let me write that down...');
      const data = JSON.stringify(guildData);
      fs.writeFile(`./guilds/${message.guild.id}/guild.json`, data, (err) => {
        if(err) throw err;
        if( isVerbose )
          message.say('Done.');
      });
    }
    if( action === 'load' ) {
      if(isVerbose)
        message.say('Loading...');
      loader.load(message.guild);
      if(isVerbose)
        message.say('Done.');
    }
  }
};
