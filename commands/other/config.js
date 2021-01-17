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
          key: 'args',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    });
  }
  async run(message, { action, verbose, args } ){
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
        autoRole: message.guild.autoRole || null,
        moderators: message.guild.moderators || []
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
    if( action === 'set' ){
      if( !message.guild.checkIsMod( message.author ) )
      return message.say("I... don't think you're allowed to do that. Go find an adult.");
      let splArgs = args.split(' ');
      let target = splArgs[0];
      let value = splArgs[1];
      if( target.length >= 3 && 'mod-role'.startsWith(target) ) {
        let mention = value.match(/<@&(\d+)>/);
        if( !mention ) {
          message.guild.roles.cache.some( role => {
            if( role.name.toLowerCase() === value.toLowerCase() ) {
              mention = role.id;
              return true;
            } else return false;
          });
        } else mention = mention[1];

        if( mention ) {
          message.guild.moderators.push(mention);
          message.say(`Moderator role list changed. List length is now ${message.guild.moderators.length}; don't forget to save.`);
        } else return message.say("Couldn't find that role.");
      }
    }

    //console.log(this);
    //message.say("Unrecognized subcommand.");
  }
};
