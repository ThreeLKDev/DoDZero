const ytdl = require("ytdl-core");
const { util } = require('discord.js');
module.exports = {
  name: 'test',
  description: 'Play a song',
  async execute(msg, args) {
    msg.reply('Test 0.4');
    msg.channel.send('Test A');
    console.log('-------------------------MESSAGE----------------------------');
    console.log(msg);
    console.log('-------------------------MEMBER-----------------------------');
    console.log(msg.member);
    console.log('-------------------------VOICE-----------------------------');
    console.log(msg.member.voice);
    const { channel } = msg.member.voice;
    if (!channel) {
      msg.channel.send('Not a voice channel!');
    } else {
      msg.channel.send('In a voice channel.');
    }
    msg.channel.send('Test B');
  }
};
