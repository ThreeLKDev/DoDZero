const { Command } = require('discord.js-commando');

module.exports = class RoleProgressionCommand extends Command {
  constructor(client){
    super(client, {
      name: 'roleprogression',
      group: 'guild',
      memberName: 'roleprogression',
      description: ' ',
      guildOnly: true,
      args: [
        {
          key: 'args',
          prompt: ' ',
          type: 'string',
          default: ''
        }
      ]
    });
  }
  async run( message, { args } ){
    args = args.toLowerCase();
    let parse = true;
    let roles = message.guild.roles.cache.values();
    if( args ) {
      if( args.startsWith( 'list' ) ){
        let list = [];
        if( args == 'listprogression' )
          list = message.guild.autoRole.progressionRoles;
        else if( args == 'listaway' )
          list = message.guild.autoRole.awayRoles;
        else if( args == 'listignore' )
          list = message.guild.autoRole.ignoreRoles;
        else if( args == 'listunknown' ) {
          let roleKnown;
          for( let role of roles ) {
            roleKnown = false;
            for( let progRole of message.guild.autoRole.progressionRoles ) {
              if( role.name == progRole.name ) {
                roleKnown = true;
                break;
              }
            }
            if( !roleKnown ) {
              for( let awayRole of message.guild.autoRole.awayRoles ) {
                if( role.name == awayRole.name ) {
                  roleKnown = true;
                  break;
                }
              }
            }
            if( !roleKnown ) {
              for( let ignoreRole of message.guild.autoRole.ignoreRoles ) {
                if( role.name == ignoreRole.name ) {
                  roleKnown = true;
                  break;
                }
              }
            }
            if( !roleKnown ) {
              list.push( role );
            }
          }
        }

        if( list.length > 0 ) {
          let reply = ``;
          for( let entry of list ) {
            reply += `${entry.name}\n`
          }
          message.say(reply);
        } else {
          message.say("Unrecognized list type.");
        }
        parse = false;
      }
    }
    if( parse ) {
      let progMapMsg = await message.say("Beginning role progression assignment.")
      let progression = [];
      let progText = "";
      let ignore = [];
      let away = [];
      let remaining = message.guild.roles.cache.size;
      for( let role of roles ) {
        if( args == '' ) {
          ( async () => {
            let msg = await message.say(role.name);
            ( async () => {
              await msg.react('✅');
              await msg.react('💤');
              msg.react('❌');
            })();
            const collector = msg.createReactionCollector( ( reaction, user ) => !user.bot && user.id == message.author.id && ( reaction.emoji.name === '✅' || reaction.emoji.name === '❌' || reaction.emoji.name === '💤' ), { max: 1 } );
            collector.on('collect', async ( reaction, user ) => {
              if( reaction.emoji.name === '✅'){
                progression.push(role);
              } else if( reaction.emoji.name === '❌') {
                ignore.push(role);
              } else {
                away.push(role);
              }
              remaining--;
              console.log(remaining);
              if( remaining == 0 ){
                message.guild.autoRole.ignoreRoles = ignore;
                message.guild.autoRole.progressionRoles = progression;
                message.guild.autoRole.awayRoles = away;
                message.say("Finished.");
              }
            });
            collector.on("end", ()=>{
              msg.delete();
            });
          }) ();
        } else if ( args.toLowerCase() == role.name.toLowerCase() ) {
          let msg = await message.say(role.name);
          ( async () => {
            await msg.react('✅');
            await msg.react('💤');
            msg.react('❌');
          } )();
          const collector = msg.createReactionCollector( ( reaction, user ) => !user.bot && user.id == message.author.id && ( reaction.emoji.name === '✅' || reaction.emoji.name === '❌' || reaction.emoji.name === '💤' ), { max: 1 } );
          collector.on('collect', async ( reaction, user ) => {
            if( reaction.emoji.name === '✅'){
              message.guild.autoRole.progressionRoles.push(role);
            } else if( reaction.emoji.name === '❌') {
              message.guild.autoRole.ignoreRoles.push(role);
            } else {
              message.guild.autoRole.awayRoles.push(role);
            }
          });
          collector.on("end", ()=>{
            message.say("Finished.");
            msg.delete();
          });
        }
      }
    }
  }
}
