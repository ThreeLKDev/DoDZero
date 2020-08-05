require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({private_key: process.env.XIVAPI });
const { createCanvas, loadImage, Image } = require('canvas');
const { MessageAttachment } = require('discord.js');
const fs = require('fs');
const host = 'https://xivapi.com';
const dir = './res/xiv';
const file = `${dir}/background.png`;
const batchSize = 8;
const batch = new Array(batchSize);
var batchPtr = 0;
var background = null;
var pass = 0;

module.exports = class ProcessPortraitCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'processportrait',
      group: 'xiv',
      memberName: 'processportrait',
      ownerOnly: true,
      description: '',
      aliases: [ 'pp' ],
      args: [
        {
          key: 'portrait',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    });
  }
  async run( message, { portrait } ) {

    const width = 640;
    const height = 873;
    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext('2d');

    if( background == null ) {
      //Using a try/catch for proper blocking
      background = new Image();
      try{
        let data = fs.readFileSync(file);
        background.src = data;
        console.log( data );
      } catch (err) {
        if( err.code === 'ENOENT' ) {
          fs.mkdirSync(dir, { recursive: true } );
          ctx.fillStyle = '#ff00ff';
          ctx.fillRect(0,0,width,height);
          const buffer = canvas.toBuffer('image/png');
          fs.writeFileSync(file,buffer);
          background.src = buffer;
          console.log('File read fail, creating bg');
          console.log(buffer);
          console.log(canvas.toBuffer());
        }
      }
    }

    let img = null;
    if(portrait != '') {
      if(portrait.endsWith('.jpg') ) {
        let img = await loadImage(portrait)
        ctx.drawImage(img, 0, 0);
        batch[batchPtr++] = ctx.getImageData(0,0,width,height);
        message.say(`Added image to batch. Batch is at ${batchPtr}/${batch.length}.`);
      }
    }

    if(batchPtr >= batch.length || portrait == 'flush') {
      //Do the thing
      message.channel.startTyping();
      await message.say(`Beginning comparison, this may take a while...`);
      if(batch[0] == null || batch[0] == 'undefined' ) {
      } else {
        ctx.drawImage(background,0,0);
        let bgData = ctx.getImageData(0,0,width,height);
        console.log(bgData);
        let rIndex,gIndex,bIndex,aIndex;
        for( let row = 0; row < height; row++ ) {
          for( let col = 0; col < width; col++ ) {
            rIndex = ( col + ( row * width ) ) * 4;
            gIndex = rIndex + 1;
            bIndex = rIndex + 2;
            aIndex = rIndex + 3;
            if( ProcessPortraitCommand.compareArrays( bgData.data, rIndex, [255,0,255,255], 0, 4 ) ) {
              // Unsaved pixel, begin
              // Pessimistic
              let result = true
              for( let i = 0; i < batch.length-1; i++ ) {
                if( batch[i+1] === null || batch[i+1] === undefined )
                  break;
                result = result && ProcessPortraitCommand.compareArrays( batch[i].data, rIndex, batch[i+1].data, rIndex, 4 );
                if(!result) break;
              }

              // // Optimistic
              // let result = false;
              // for( let i = 0; i < batch.length-1; i++ ) {
              //   if(batch[i] === null || batch[i] === undefined)
              //     continue;
              //   for( let j = i+1; j < batch.length; j++ ) {
              //     if( batch[j] === null || batch[j] === undefined )
              //       continue;
              //     result = ProcessPortraitCommand.compareArrays( batch[i].data, rIndex, batch[j].data, rIndex, 4 );
              //     if(result) break;
              //   }
              //   if(result) break;
              // }
              if(result) {
                pass++;
                bgData.data[rIndex] = batch[0].data[rIndex];
                bgData.data[gIndex] = batch[0].data[gIndex];
                bgData.data[bIndex] = batch[0].data[bIndex];
                bgData.data[aIndex] = batch[0].data[aIndex];
              }
            }
          }
        }
        ctx.clearRect(0,0,width,height);
        ctx.putImageData(bgData,0,0);
        let newBuffer = canvas.toBuffer('image/png');
        background.src = newBuffer;
        const att = new MessageAttachment(canvas.toBuffer(), `background.png`);
        message.say(att);
        for( let b = 0; b < batch.length; b++ ) {
          delete batch[b];
        }
        batchPtr = 0;
      }
      message.channel.stopTyping();
      message.say(`Finished with ${pass} successes.`);
    } else if( portrait == 'show' ){
      ctx.drawImage(background,0,0);
      let nb = canvas.toBuffer('image/png');
      const atta = new MessageAttachment(nb, 'bg.png');
      console.log(atta);
      message.say(atta);
    } else if( portrait == 'save' ){
      console.log(background.src + '\n----------\n');
      ctx.drawImage(background,0,0);
      const saveBuffer = canvas.toBuffer('image/png');
      console.log(saveBuffer);
      fs.writeFileSync(file,saveBuffer);
      background.src = saveBuffer;
      // background.src = buffer;
      message.say('Saved.');
    }
  }
  static compareArrays( array1, startIndex1, array2, startIndex2, length ) {
    let result = true;
    for( let i = 0; i < length; i++ ) {
      result = result && array1[startIndex1 + i] == array2[startIndex2 + i];
      if(!result) break;
    }
    return result;
  }
}
