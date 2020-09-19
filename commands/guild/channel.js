require('dotenv').config();
const { MessageMentions, GuildChannel } = require('discord.js');
const { Command } = require('discord.js-commando');
const prefix = process.env.PREFIX;
module.exports = class WatchCommand extends Command {
  constructor(client) {
    super( client, {
      name: 'channel',
      memberName: 'channel',
      group: 'guild',
      description: 'Track the channel that the command was called in.',
      guildOnly: true,
      args: [
        {
          key: 'channelType',
          default: 'text',
          prompt: 'What kind of channel am I tracking? Text or voice?',
          type: 'string',
          validate: function(channelType) {
            channelType = channelType.toLowerCase();
            return channelType == 'text' || channelType == 'voice' || channelType == 'pixiv' || channelType == 'log';
          }
        },
        {
          key: 'mentions',
          type: 'string',
          prompt: '',
          default: ''
        }
      ]
    } );
  }
  run(message, { channelType, mentions }) {
    var mentionedChannels = mentions.match(MessageMentions.CHANNELS_PATTERN);
    var mentionedChannel = null;
    if(mentionedChannels) {
      let id = mentionedChannels[0].match(/\<\#(\d+)\>/);
      mentionedChannel = message.guild.channels.cache.get(id[1]);
    }
    if( channelType == 'text' ) {
      const channel = mentionedChannel ? mentionedChannel : message.channel;
      let numChannels = message.guild.channelWatch.text.length;
      if( numChannels == 0 ) {
        if(!message.guild.channelWatch.text.includes(channel.id)) {
          message.guild.channelWatch.text.push(channel.id);
          message.say(`Understood, now tracking ${channel.name} [${channel.id}]`);
        } else return message.say('That channel is already being tracked.');
      }
    } else if( channelType == 'voice' ){
      const channel = mentionedChannel ? mentionedChannel : message.member.voice.channel;
      if(!channel) return  message.say('You aren\'t in a voice channel.');
      if(!channel.type == 'voice')
        return message.say('Channel type isn\'t voice.');
      if(!message.guild.channelWatch.voice.includes(channel.id)) {
        message.guild.channelWatch.voice.push(channel.id);
        message.say(`Whitelisted voice channel ${channel.name} [${channel.id}]`);
      } else return message.say('That channel is already being tracked.');
    } else if( channelType == 'pixiv' ) {
      const channel = mentionedChannel ? mentionedChannel : message.channel;
      let numChannels = message.guild.channelWatch.text.length;
      if(!message.guild.channelWatch.pixiv.includes(channel.id)) {
        message.guild.channelWatch.pixiv.push(channel.id);
        message.say(`Understood, now tracking ${channel.name} [${channel.id}]`);
      } else return message.say('That channel is already being tracked.');
    } else if( channelType == 'log' ){
      const channel = mentionedChannel ? mentionedChannel : message.channel;
      message.guild.channelWatch.log = channel.id;
      message.say(`Log channel set as ${channel.name} [${channel.id}]`);
    }
  }
}
