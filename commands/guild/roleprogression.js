const { Command } = require('discord.js-commando');

module.exports = class RoleProgressionCommand extends Command {
  constructor(client){
    super(client, {
      name: 'roleprogression',
      group: 'guild',
      memberName: 'roleprogression',
      description: ' ',
      guildOnly: true,
      args: []
    });
  }
  async run( message ){
    let progMapMsg = await message.reply("Beginning role progression assignment.")
    let roles = message.guild.roles.cache.values();
    let progression = [];
    let progText = "";
    let ignore = [];
    let remaining = message.guild.roles.cache.size;
    let currentMsg = await message.say('...');
    for( let role of roles ) {
      ( async () => {
        let msg = await message.say(role.name);
        ( async () => {
          await msg.react('✅');
          msg.react('❌');
        })();
        const collector = msg.createReactionCollector( ( reaction, user ) => !user.bot && user.id == message.author.id && ( reaction.emoji.name === '✅' || reaction.emoji.name === '❌' ), { max: 1 } );
        collector.on('collect', async ( reaction, user ) => {
          if( reaction.emoji.name === '✅'){
            progression.push(role);
          } else {
            ignore.push(role);
          }
          remaining--;
          console.log(remaining);
          if( remaining == 0 ){
            console.log(`Progression:${progression}`);
            console.log(`Ignore:${ignore}`);
            message.guild.autoRole.ignoreRoles = ignore;
            message.guild.autoRole.progressionRoles = progression;
          }
        });
        collector.on("end", ()=>{
          msg.delete();
        });
      }) ();
    }
  }
}
