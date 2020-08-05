require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const { createCanvas, loadImage } = require('canvas');
const { MessageAttachment } = require('discord.js');
const host = 'https://xivapi.com';
const iconSize = 60;
const fontSize = 22;

module.exports = class WhoAmICommand extends Command {
  constructor(client){
    super(client, {
      name: 'equipment',
      group: 'xiv',
      memberName: 'equipment',
      ownerOnly: true,
      description: 'Placeholder for current work-in-progess command.'
    });
  }
  async run( message ) {
    message.channel.startTyping();
    let res = await xiv.character.search('Aislinn Rei', {server: 'lamia'} );
    let query = await xiv.character.get(
      res.Results[0].ID, {
        extended: true,
          data : 'FC,CJ',
   //       columns: ['Character.Name','Character.ID','Character.Portrait',
   //       'Character.Title.Name', 'Character.Race.Name', 'Character.Tribe.Name',
   //     'Character.GuardianDeity.Name','Character.GrandCompany.Company.Name',
   //     'Character.GrandCompany.Rank.Name', 'FreeCompany.Name',
   //     'Character.DC', 'Character.Server', 'Character.ClassJobs.*.Level',
   //   'Character.ClassJobs.*.IsSpecialised','Character.ClassJobs.*.Class.Name',
   // 'Character.ClassJobs.*.Class.Icon'].join(',')
      }
    );
    let char = query.Character;
    let fc = query.FreeCompany;
    console.log(query);
    console.log(char.ClassJobs[13]);

    const profile = await loadImage( `${char.Portrait}` );
    const canvas = createCanvas(Math.floor(profile.width*1.5), profile.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(profile, 0, 0, profile.width, profile.height);
    WhoAmICommand.drawBackground( profile, canvas, ctx );
    let iconsPerSide = Math.floor(profile.height / iconSize);
    let max = iconsPerSide * 2;
    if( max > char.ClassJobs.length )
      max = char.ClassJobs.length;
    console.log( [max, char.ClassJobs.length] );
    for( let i = 0; i < max; i++ ) {
      await WhoAmICommand.drawJob(ctx,char.ClassJobs[i],
        i>=iconsPerSide ? (canvas.width) : 0, //TODO
         ( i % iconsPerSide ) * iconSize, i>=iconsPerSide);
    }

    const attachment = new MessageAttachment(canvas.toBuffer(), `${char.Name}.png`);

    message.channel.stopTyping();
    message.say(attachment);
  }
  static async drawJob( ctx, job, x, y, flip ){
    ctx.font = `bold ${fontSize}pt sans-serif`;
    ctx.textAlign= flip ? 'right' : 'left';
    let text = ctx.measureText(`${job.Level}`);
    if(job.IsSpecialised) {
      if(job.Level == 80) {
        ctx.fillStyle = 'purple';
        ctx.strokeStyle = 'orange';
      } else {
        ctx.fillStyle = 'blue';
        ctx.strokeStyle = 'red';
      }
    } else {
        if(job.Level == 80) {
          ctx.fillStyle = 'orange';
          ctx.strokeStyle = 'purple';
        } else {
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
        }
    }
    ctx.fillText(`${job.Level}`, x + ( flip ? -iconSize : +iconSize ), y + ( iconSize * 0.5 ) + 11 );
    ctx.strokeText(`${job.Level}`, x + ( flip ? -iconSize : +iconSize ), y + ( iconSize * 0.5 ) + 11 );
    let icon = await loadImage(`${host}${job.Class.Icon}`);
    ctx.drawImage(icon, flip ? ( x - iconSize ) : x, y, iconSize, iconSize);
  }
  static drawBackground( profile, canvas, ctx ) {
    const pFull = profile.width;
    const pHalf = profile.width/2;
    const pSixth = Math.ceil(profile.width/6);
    const profileDataLeft = ctx.getImageData(pHalf, 0, pSixth, profile.height );
    const profileDataRight = ctx.getImageData( ( pFull + pHalf ) - pSixth, 0,  pSixth, profile.height );
    const fullData = ctx.getImageData(0,0,canvas.width,canvas.height);
    for( let row = 0; row < profile.height; row++ ){
      for( let col = 0; col <= pSixth; col++ ) {
        let sliceIndex = ( col + ( row * pSixth ) ) * 4
        let leftIndex = ( (col * 4) + ( row * canvas.width ) ) * 4;
        let rightIndex = ( (col * 4) + ( ( pFull + pHalf ) - pSixth ) + ( row * canvas.width ) ) * 4;
        if( row == 0 && col <= 1 ) {
          console.log(`${col}\n\tslice: ${sliceIndex}\n\tleft: ${leftIndex}\n\tright: ${rightIndex}`);
        }

        for( let i = 0; i < 4; i++ ) { //TODO: Blending
          let j = i * 4;
          fullData.data[leftIndex+j] = profileDataLeft.data[sliceIndex];
          fullData.data[leftIndex+1+j] = profileDataLeft.data[sliceIndex+1];
          fullData.data[leftIndex+2+j] = profileDataLeft.data[sliceIndex+2];
          fullData.data[leftIndex+3+j] = profileDataLeft.data[sliceIndex+3];

          fullData.data[rightIndex+j] = profileDataRight.data[sliceIndex];
          fullData.data[rightIndex+1+j] = profileDataRight.data[sliceIndex+1];
          fullData.data[rightIndex+2+j] = profileDataRight.data[sliceIndex+2];
          fullData.data[rightIndex+3+j] = profileDataRight.data[sliceIndex+3];
        }

      }
    }

    ctx.putImageData(fullData,0,0);
  }
};
