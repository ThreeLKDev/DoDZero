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
          key: 'selectRole',
          prompt: ' ',
          type: 'string',
          default: ''
        }
      ]
    });
  }
  async run( message, { selectRole } ){
    let progMapMsg = await message.reply("Beginning role progression assignment.")
    let roles = message.guild.roles.cache.values();
    let progression = [];
    let progText = "";
    let ignore = [];
    let away = [];
    let remaining = message.guild.roles.cache.size;
    for( let role of roles ) {
      if( selectRole == '' ) {
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
      } else if ( selectRole.toLowerCase() == role.name.toLowerCase() ) {
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
