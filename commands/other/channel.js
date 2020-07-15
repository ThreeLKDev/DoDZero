require('dotenv').config();
const { Command } = require('discord.js-commando');
const prefix = process.env.PREFIX;
module.exports = class WatchCommand extends Command {
  constructor(client) {
    super( client, {
      name: 'channel',
      memberName: 'channel',
      group: 'other',
      description: 'Tack the channel that the command was called in.',
      guildOnly: true,
      args: [
        {
          key: 'channelType',
          default: 'text',
          prompt: 'What kind of channel am I tracking? Text or voice?',
          type: 'string',
          validate: function(channelType) {
            channelType = channelType.toLowerCase();
            return channelType == 'text' || channelType == 'voice';
          }
        }
      ]
    } );
  }
  run(message, { channelType }) {
    if( channelType == 'text' ) {
      const channel = message.channel;
      let numChannels = message.guild.channelWatch.text.length;
      if( numChannels == 0 ) {
        message.guild.channelWatch.text.push(channel.id);
        message.say(`Understood, now tracking ${channel.name} [${channel.id}]`);
      }
    } else if( channelType == 'voice' ){
      const channel = message.member.voice.channel;
      if(!channel) return  message.say('You aren\'t in a voice channel.');
      message.guild.channelWatch.voice.push(channel.id);
      message.say(`Whitelisted voice channel ${channel.name} [${channel.id}]`);
    }
  }
}
