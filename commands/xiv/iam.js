require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const { MessageEmbed, MessageAttachment, MessageCollector } = require('discord.js');
const prefix = process.env.PREFIX;
const sqlite3 = require('sqlite3').verbose();

module.exports = class IAmCommand extends Command {
  constructor(client){
    super(client, {
      name: 'iam',
      group: 'xiv',
      memberName: 'iam',
      guildOnly: true,
      description: 'Identifies yourself and gives you the requisite Roles.',
      args: [
        {
          key: 'args',
          prompt: 'Identify yourself.',
          type: 'string',
          default: ''
        }
      ]
    });
  }
    async run( message, { args } ) {
      if( !message.guild.xiv.iamRole )
        return message.say(`No role has been defined yet. Have a server mod use \`${prefix}xiv-config iam-role <role>\` before using this command!`);
      console.log('BEGIN');
      let where = '';
      let split = args.split(' ');
      if( split.length > 2 )
        where = split[2];
      else where = message.guild.xiv.defaultServer;
      let who = `${split[0]} ${split[1]}`;
      console.log(`\tWho: ${who}\n\tWhere: ${where}`);
      message.channel.startTyping();
      let res = await xiv.character.search( who, where ? {server: where} : {} );
      if( !res ) console.error('[iam] Res is null? Arg(s) : ' + args);
      if( res.Results && res.Results.length == 0 ) {
        //Retry in case of an initial failure
        console.log('[iam] Results were empty, retrying...');
        res = await xiv.character.search( who, where ? {server: where} : {} );
      }
      console.log(res);
      if( res.Results && res.Results.length > 0 ) {
        console.log('Results');

        let embed = new MessageEmbed({
          title: "Is this you?",
          thumbnail: { url: res.Results[0].Avatar },
          fields: [
            {
              name: res.Results[0].Name,
              value: res.Results[0].Server,
              inline: false
            }
          ]
        });
        let identifyMsg = await message.channel.send({ embed: embed });
        console.log('Sent?');
        let _this = this;
        let correct = function(character) {
          let member = message.guild.members.cache.get( message.author.id );
          member.roles.add( message.guild.roles.cache.get( message.guild.xiv.iamRole ) );
          member.setNickname(character.Name);
          message.say({ embed: {
            title: `Welcome, ${character.Name.split(' ')[0]}!`,
            description: `Success: We've added you to the books!`,
            thumbnail: { url: character.Avatar },
            fields: [
              {
                name: '**Role**',
                value: ` + <@&${message.guild.xiv.iamRole}>`,
                inline: true
              },
              {
                name: '**Nickname**',
                value: `Changed to ${character.Name}`,
                inline: true
              },
              {
                name: '**Commands**',
                value: `Show off with \`${prefix}portrait\` and \`${prefix}whoami\``,
                inline: true
              }
            ],
            footer: { text: `Go say 'hi' in General!` }
          } });
          // Update user database.
          _this.client.sqlite.registerMember(null, message.author.id, character.ID, message.guild.id);
        };

        //Anonymous async functions are cool, okay?
        ( async () => {
          await identifyMsg.react('✅');
          identifyMsg.react('❌');
        } )();

        const collector = identifyMsg.createReactionCollector( ( reaction, user ) => !user.bot && user.id == message.author.id, { time: 90000 } );
        collector.on('collect',async ( reaction, user ) => {
          identifyMsg.reactions.cache.get(reaction.emoji.name).users.remove(user.id);
          if( reaction.emoji.name === '✅' ) {
            correct(res.Results[0]);
            collector.stop();
          } else if ( reaction.emoji.name === '❌' ) {
            const max = Math.min( 50, res.Results.length);
            const charEmbed = new MessageEmbed()
              .setTitle('Are you one of these?')
              .setDescription('Enter the number to the left of the correct character, or `cancel` to cancel.');

            for( let i = 0; i < max; i+=2 ) {
              charEmbed.addField( `[${i}] ${res.Results[i].Name}`,
                res.Results[i+1]
                ? `[${i+1}] ${res.Results[i+1].Name}`
                : '-- - -- - --' );
            }
            const listMessage = await message.channel.send({embed: charEmbed});

            const msgCollector = new MessageCollector( message.channel, msg=>msg.author === message.author, { time: 90000 } );
            msgCollector.on('collect', msg => {
              let arg = msg.content.trim().split(' ');
              let selection = parseInt(arg[0]);
              if( selection != 'NaN' && selection < max && selection >= 0 ) {
                correct(res.Results[selection]);
                msgCollector.stop();
              } else if( arg[0] == 'cancel' ) {
                msgCollector.stop();
              } else msg.reply(`Please respond with a number between 0 and ${max}, or \`cancel\`.`);
            });
            msgCollector.on('end', ()=>{
              listMessage.delete();
            });
            collector.stop();
          } else console.log('Reaction!');
        });
        collector.on('end', ()=>{
          identifyMsg.reactions.cache.get('✅').users.remove( message.guild.me.user.id );
          identifyMsg.reactions.cache.get('❌').users.remove( message.guild.me.user.id );
        });
      }

      message.channel.stopTyping();
    }
};
