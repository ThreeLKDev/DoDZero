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
        }
      ]
    });
  }
  async run(message, { action, verbose } ){
    if( verbose === null || verbose === undefined )
      verbose = true;
    else {
      if( typeof verbose === 'string' ) {
        verbose = verbose.toLowerCase();
        verbose = ( verbose === 'true' || verbose === 'verbose' );
      } else verbose = ( verbose ? true : false );
    }
    action = action.toLowerCase();
    if( action === 'save' ) {
      const guildData = {
        channelWatch: message.guild.channelWatch || null,
        xiv:  message.guild.xiv || null,
        freeCompany: message.guild.freeCompany || null,
        autoRole: { hasTask: message.guild.autoRole.hasTask }
      }
      if( verbose )
        message.say('Let me write that down...');
      const data = JSON.stringify(guildData);
      fs.writeFile(`./guilds/${message.guild.id}/guild.json`, data, (err) => {
        if(err) throw err;
        if( verbose )
          message.say('Done.');
      });
    }
    if( action === 'load' ) {
      if(verbose)
        message.say('Loading...');
      loader.load(message.guild);
      if(verbose)
        message.say('Done.');
    }
  }
};
