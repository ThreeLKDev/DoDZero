const { Command } = require('discord.js-commando');
const loader = require('../../loader.js');
//const fs = require('fs');
module.exports = class LoadCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'load',
      memberName: 'load',
      group: 'other',
      description: 'Load session data ( watched channels ) from file.',
      guildOnly: true,
      args: [
        {
          key: 'verbose',
          prompt: 'Should I tell you what I\'m doing?',
          type: 'string',
          default: 'true',
          oneOf: ['true','false']
        }
      ]
    });
  }

  async run(message, { verbose } ) {
    if(verbose == 'true')
      message.say('Loading...');

    //fs.readFile('guild.json','utf-8',(err,data)=>{
      //if(err) throw err;
      //const channelWatch = JSON.parse(data.toString());
      //message.guild.channelWatch.text = channelWatch.text;
      //console.log('Loaded text channels. Result: ' + message.guild.channelWatch.text);
      //message.guild.channelWatch.voice = channelWatch.voice;
      //console.log('Loaded voice channels. Result: ' + message.guild.channelWatch.voice);
      loader.load(message.guild);

      if(verbose == 'true')
      message.say('Done.');
//    });
  }

};
