require('dotenv').config();
const { Command } = require('discord.js-commando');
const prefix = process.env.PREFIX;

module.exports = class XIVCommand extends Command {
  constructor( client ) {
    super( client, {
      name: 'xiv-config',
      group: 'xiv',
      memberName: 'xiv-config',
      aliases: ['xiv'],
      description: 'Manage FFXIV-related command configuration.',
      args: [
        {
          key: 'arg0',
          prompt: '',
          type: 'string',
          default: 'help'
        },
        {
          key: 'arg1',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    });
  }

  run( message, { arg0, arg1 } ) {
    arg0 = arg0.toLowerCase();
    if( arg0 == 'help' ) { // -------------------------------------------- Help
      message.author.send({ embed: { title: `XIV-config command usage`,
        description: `\`${prefix}xiv-config <default-server> <args>\`\nCommand alias is 'xiv'`,
        fields: [
          {
            name: `**${prefix}xiv-config default-server** *<server>*`,
            value: `Allows you to define the default FFXIV server to associate with this Discord server. Commands like **${prefix}iam** *<firstname> <lastname> <server>* will use this value when nothing is given for *<server>*. Note that there are no error-checking measures at the moment; make sure you type the server name correctly.`
          }
        ]
      } });
    } else if( arg0 === 'default-server' ) { // ---------------- Default-Server
      if( arg1 && arg1 !== undefined ) {
        message.guild.xiv.defaultServer = arg1;
        message.say(`Default FFXIV server set to \`${arg1}\`.`);
      }
    } else if( arg0 === 'iam-role' ) {
      let mention = arg1.match(/<@&(\d+)>/);
      if( !mention ) {
        message.guild.roles.cache.some( role => {
          if( role.name.toLowerCase() === arg1.toLowerCase() ) {
            mention = role.id;
            return true;
          } else return false;
        } );
      } else mention = mention[1];

      if( mention ) {
        message.guild.xiv.iamRole = mention;
        message.say(`\`iam\` role set to ${message.guild.roles.cache.get(mention).name}`);
      } else return message.say(`Couldn't find that Role.`);

    }
  }
};
