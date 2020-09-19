require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const { MessageEmbed, MessageAttachment, MessageCollector } = require('discord.js');
const { createCanvas, loadImage, Image } = require('canvas');

module.exports = class SetFCCommand extends Command {
  constructor(client){
    super(client, {
      name: 'setfc',
      group: 'xiv',
      memberName: 'setfc',
      guildOnly: true,
      description: 'Identifies the Free Company to associate this server with.',
      args: [
        {
          key: 'server',
          prompt: 'Which server?',
          type: 'string',
        },
        {
          key: 'name',
          prompt: 'Which FC?',
          type: 'string',
        }
      ]
    });
  }
  async run( message, { server, name } ) {
    console.log(`[setfc] Beginning, args are server:${server}, name:${name}`);
    message.channel.startTyping();
    let res = await xiv.freecompany.search( name, {server: server } );
    message.channel.stopTyping();
    if( !res ) {
      console.error(`[setfc] Res is null?`);
      message.say("Uh oh, something went wrong!");
      return;
    }
    if( res.Results && res.Results.length == 0 ) {
      // Retry in case of a hiccup
      console.log(`[setfc] Results were empty, retrying...`);
      res = await xiv.freecompany.search( name, {server: server } );
      if( res.Results && res.Results.length == 0 ) {
        message.say("No results found!");
      }
    }

    let correct =  async function(message, id) {
      message.channel.startTyping();
      let query = await xiv.freecompany.get(res.Results[0].ID, {
        extended: true,
        columns: ['FreeCompany.Name','FreeCompany.GrandCompany','FreeCompany.Slogan','FreeCompany.Crest','FreeCompany.ID'].join(',')
      });
      message.channel.stopTyping();

      console.log(`[setfc] Query results:`);
      console.log(query);
      message.channel.guild.freeCompany.ID = query.FreeCompany.ID;
      message.channel.guild.freeCompany.Name = query.FreeCompany.Name;
      message.channel.guild.freeCompany.Crest = query.FreeCompany.Crest;
      message.channel.guild.freeCompany.Slogan = query.FreeCompany.Slogan;

      console.log(`[setfc] Building embed...`);
      const images = [];
      for( let i = 0; i < query.FreeCompany.Crest.length; i++ ){
        images[i] = await loadImage(`${query.FreeCompany.Crest[i]}`);
      }
      const canvas = createCanvas(images[0].width, images[0].height);
      const ctx = canvas.getContext('2d');
      for( let j = 0; j < images.length; j++ ) {
        ctx.drawImage(images[j], 0, 0);
      }

      const attachment = new MessageAttachment(canvas.toBuffer(), `fc.png`);

      const fcEmbed = new MessageEmbed({
        title: query.FreeCompany.Name,
        thumbnail: { url: 'attachment://fc.png' },
        description: query.FreeCompany.Slogan,
        files: [attachment]
      });

      message.channel.send({embed: fcEmbed});

      console.log(`[setfc] Finished.`);
    };

      let embed = new MessageEmbed({
        title: 'Is this correct?',
        fields: [
          {
            name: res.Results[0].Name,
            value: res.Results[0].Server,
            inline: false
          }
        ]
      });
      let identifyMsg = await message.channel.send({ embed: embed });

      ( async () => {
        await identifyMsg.react('✅');
        identifyMsg.react('❌');
      } )();

      const collector = identifyMsg.createReactionCollector( ( reaction, user ) => !user.bot && user.id == message.author.id, { time: 90000 } );
      collector.on('collect',async ( reaction, user ) => {
        identifyMsg.reactions.cache.get(reaction.emoji.name).users.remove(user.id);
        if( reaction.emoji.name === '✅' ) {
          correct(message, res.Results[0].ID);
          collector.stop();
        } else if ( reaction.emoji.name === '❌' ) {
          const max = Math.min( 50, res.Results.length );
          const fcEmbed = new MessageEmbed()
            .setTitle('Are you one of these?')
            .setDescription('Enter the number to the left of the correct FC, or `cancel` to cancel.');
          for( let i = 0; i < max; i+= 2 ) {
            fcEmbed.addField( `[${i}] ${res.Results[i].Name}`,
              res.Results[i+1]
              ? `[${i+1} ${res.Results[i+1].Name}`
              : '-- - -- - --' );
          }
          const listMessage = await message.channel.send({embed:fcEmbed});
          const msgCollector = new MessageCollector( message.channel, msg => msg.author === message.author, { time: 90000 } );
          msgCollector.on('collect', msg => {
            let arg = msg.content.trim().split(' ');
            let selection = parseInt(arg[0]);
            if( selection != 'NaN' && selection < max && selection >= 0 ) {
              correct(message, res.Results[selection].ID);
              msg.delete();
              msgCollector.stop();
            } else if ( arg[0] == 'cancel' ) {
              msgCollector.stop();
            } else msg.reply(`Please respond with a number between 0 and ${max}, or \`cancel\`.`);
          });
          msgCollector.on('end', ()=>{
            listMessage.delete();
          });
          collector.stop();
        }
      });
      collector.on('end', ()=>{
        identifyMsg.reactions.cache.get('✅').users.remove( message.guild.me.user.id );
        identifyMsg.reactions.cache.get('❌').users.remove( message.guild.me.user.id );
      });
      console.log('[setfc] IdentifyMSG Sent, awaiting reaction.');


  }
};
