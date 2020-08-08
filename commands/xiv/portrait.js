require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const { createCanvas, loadImage } = require('canvas');
const { MessageAttachment } = require('discord.js');
const host = 'https://xivapi.com';

module.exports = class PortraitCommand extends Command {
  constructor(client){
    super(client, {
      name: 'portrait',
      group: 'xiv',
      memberName: 'portrait',
      description: 'Displays your character portrait.',
      args: [
        {
          key: 'args',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    });
  }
  async run( message, { args } ) {
    let who = '';
    let where = '';
    if( args ) {
      let split = args.split(' ');
      if(split.length > 2 )
        where = split[2];
      who = `${split[0]} ${split[1]}`;
    }
    if( !who ) {
      if( message.channel.guild ) { // Server
        let nickname = message.channel.guild.members.cache.get( message.author.id ).nickname;
        if( !nickname )
          return message.say(`You don't have a nickname ( or I can't see it ). Try \`${process.env.PREFIX}portrait <characterFirstname> <characterLastname> <server>\` to see the first search result, or \`${process.env.PREFIX}iam <characterFirstname> <characterLastname> <server>\` to tell me who *you* are.`);
        who = nickname;
      } else { // DM
        who = message.author.username;
      }
    }
    if( !where && message.channel.guild )
      where = 'lamia'; // TODO : Some config setting for 'default xiv server'?
      
    message.channel.startTyping();
    let res = await xiv.character.search(who, where ? {server: where} : {} );
    if( res.Results.length <= 0 ) {
      message.channel.stopTyping();
      return message.say(`Couldn't find anything on the Lodestone.`);
    }
    let query = await xiv.character.get(
      res.Results[0].ID, {
          columns: 'Character.Portrait,Character.Name'
      }
    );

    const profile = await loadImage( `${query.Character.Portrait}` );
    const canvas = createCanvas(profile.width, profile.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(profile, 0, 0, profile.width, profile.height);

    const attachment = new MessageAttachment(canvas.toBuffer(), `${query.Character.Name}.png`);

    message.channel.stopTyping();
    message.say(attachment);
  }
};
