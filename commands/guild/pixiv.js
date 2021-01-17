require('dotenv').config();
const { Command } = require('discord.js-commando');
const PixivAppApi = require('pixiv-app-api');
const pixiv = new PixivAppApi(process.env.PIXIV_USER, process.env.PIXIV_PASS);
const prefix = process.env.PREFIX;
const got = require('got');
const path = require('path');
const { createCanvas, Image } = require('canvas');
const { MessageAttachment, MessageEmbed } = require('discord.js');
module.exports = class PixivCommand extends Command {
  constructor(client) {
    super( client, {
      name: 'pixiv',
      memberName: 'pixiv',
      group: 'guild',
      description: 'Inserts embeds pixiv images from their URLs',
      guildOnly: false,
      args: [
        {
          key: 'pixivUrl',
          prompt: 'What\'s the image url?',
          type: 'string',
          validate: function(pixivUrl) {
            pixivUrl = pixivUrl.toLowerCase();
            return true;
          }
        },
        {
          key: 'which',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    } );
  }
  async run(message, { pixivUrl, which }) {
    console.log(`[pixiv] Pixiv url posted in tracked channel: ${pixivUrl}${which ? ' [ ' + which + ' ]' : '' }`);
    // Validate pixiv url and get image url
    //https://www.pixiv.net/en/artworks/83241640
    if( which ) {
      which = which.trim();
      if( which.includes(' ') )
        which = which.split(' ').join(',');
      if( which.includes(',') && !which.includes('[') )
        which = `[${which}]`;
      which = JSON.parse(which);
    }
    let url = null;
    let urls = null;
    let id = pixivUrl.match( /https:\/\/www\.pixiv\.net(?:\/en)?\/artworks\/([0-9]+)/ );
    if( id ) {
      message.channel.startTyping();
      await pixiv.login();
      let query = await pixiv.illustDetail(id[1]);
      //Check if real!
      if( query.illust ) {
        if( !PixivCommand.isEmpty(query.illust.metaSinglePage) ) {
          url = query.illust.metaSinglePage.originalImageUrl ? query.illust.metaSinglePage.originalImageUrl : PixivCommand.getBestUrl(query.illust.imageUrls);
        }
        if( query.illust.metaPages.length > 0 ) {
          //Multi-page work
          urls = [];
          for( let i = 0; i < query.illust.metaPages.length; i++ ) {
            urls[urls.length] = PixivCommand.getBestUrl(query.illust.metaPages[i].imageUrls);
          }
          if( urls.length > 0 && which != '' ) {
            if( Number.isInteger( which ) ) {
              which = Math.min(Math.max(which,1),urls.length); // Clamp which, just in case. Reminder that which cannot be 0.
              url = urls[which-1];
              urls = null;
            }
            if( Array.isArray( which ) && which.length > 0 ) {
              let whichUrls = [];
              for( let i = 0; i < which.length; i++ ) {
                if( Number.isInteger(which[i]) ) {
                  let index = Math.min(Math.max(which[i],1),urls.length); // Clamp which, just in case Reminder that which cannot be 0.
                  whichUrls[whichUrls.length] = urls[index-1];
                }
              }
              urls = whichUrls
            }
          }
        }
      }
    }

    const options = {
			headers: {
				Referer: 'http://www.pixiv.net/'
			},
      responseType: 'buffer'
		};

    let list = [];
    if( url != null )
      list.push(url);
    if( urls != null ) {
      for( let j = 0; j < urls.length; j++ )
        list.push(urls[j]);
    }

    if(list.length > 0 ) {
      const embed = new MessageEmbed()
        .addField(pixivUrl,`Posted by <@${message.author.id}>`);
      await message.say({ embed: embed });
    }

    for( let k = 0; k < list.length; k++ ) {
      // if( pageLimit > 0 && k >= pageLimit ) break;
      const response = await got(list[k], options);
  		const img = new Image();
      img.src = response.body;
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      let buffer = canvas.toBuffer();
      const att = new MessageAttachment(buffer,path.basename(list[k]));
      message.channel.stopTyping();
      await message.say(att);
    }

    if( list.length > 0 && message.guild )
      message.delete();
  }
  static isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
  }
  static getBestUrl(imgUrls) {
    if( imgUrls.original )
      return imgUrls.original;
    if( imgUrls.large )
      return imgUrls.large;
    if( imgUrls.medium )
      return imgUrls.medium;
    if( imgUrls.squareMedium )
      return imgUrls.squareMedium;
    return null;
  }
}
