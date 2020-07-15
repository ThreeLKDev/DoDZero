const { Command } = require('discord.js-commando');

module.exports = class SkipCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'playhere',
      memberName: 'playhere',
      group: 'music',
      description: 'Switch voice channels.',
      guildOnly: true,
      args: [
        {
          key: 'which',
          prompt: 'Just this song, or all queued?',
          type: 'string',
          default: 'this',
          oneOf: ['this','all']
        }
      ]
    });
  }

  run(message, { which }) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Join a channel and try again');

    if (
      typeof message.guild.musicData.songDispatcher == 'undefined' ||
      message.guild.musicData.songDispatcher == null
    ) {
      return message.reply('There is no song playing right now!');
    } else {
      let numChannels = message.guild.channelWatch.voice.length;
      if(numChannels > 0) {
        let isVCWhitelisted = false;
        for( let i = 0; i < numChannels; i++ ){
          if( voiceChannel.id == message.guild.channelWatch.voice[i] ) {
            isVCWhitelisted = true;
            break;
          }
        }
        if(!isVCWhitelisted) return message.say('Your voice channel isn\'t whitelisted.');
      }
      voiceChannel.join();
      if( which == 'all' ) {
        message.guild.musicData.queue.forEach( song => {
          song.voiceChannel = voiceChannel;
        });
      }
    }
  }
};
