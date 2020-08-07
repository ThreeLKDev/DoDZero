require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const { createCanvas, loadImage, registerFont, Image } = require('canvas');
const { MessageAttachment } = require('discord.js');
const host = 'https://xivapi.com';
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const iconSize = 25;//50
const fontSize = 12;//18
const iconCardWidth = iconSize + 6;//56;
const iconCardHeight = iconSize + 20;//80
const iconXAdjust = ( iconCardWidth - iconSize ) / 2
const iconYAdjust = 3;
const spacing = 5;
const jobLayout = {
  //Tanks
  GLA: [  0, 0 ],  PLD: [  0, 0 ],
  MRD: [  1, 0 ],  WAR: [  1, 0 ],
  DRK: [  2, 0 ],
  GNB: [  3, 0 ],
  //Healers
  CNJ: [  4, 0 ],  WHM: [  4, 0 ],
  SCH: [  5, 0 ],
  AST: [  6, 0 ],
  //Phys DPS
  PGL: [  7, 0 ],  MNK: [  7, 0 ],
  LNC: [  8, 0 ],  DRG: [  8, 0 ],
  ROG: [  9, 0 ],  NIN: [  9, 0 ],
  SAM: [ 10, 0 ],
  //Ranged DPS
  ARC: [ 11, 0 ],  BRD: [ 11, 0 ],
  MCH: [  0, 1 ],
  DNC: [  1, 1 ],
  //Mages
  THM: [  2, 1 ],  BLM: [  2, 1 ],
  ACN: [  3, 1 ],  SMN: [  3, 1 ],
  RDM: [  4, 1 ],
  //Limited
  BLU: [ 11, 1 ],
  //Crafters
  CRP: [  0, 2 ],  BSM: [  1, 2 ],  ARM: [  2, 2 ],
  GSM: [  3, 2 ],  LTW: [  4, 2 ],  WVR: [  5, 2 ],
  ALC: [  6, 2 ],  CUL: [  7, 2 ],
  //Gatherers
  MIN: [  9, 2 ],  BTN: [ 10, 2 ],  FSH: [ 11, 2 ]
};
const jobLayoutDimensions = { x: 0, y: 0 };

module.exports = class WhoAmICommand extends Command {
  constructor(client){
    super(client, {
      name: 'whoami',
      group: 'xiv',
      memberName: 'whoami',
      ownerOnly: true,
      description: 'Placeholder for current work-in-progess command.'
    });
    //Set the jobLayoutDimensions object to the number of rows and columns
    let jobs = Object.getOwnPropertyNames(jobLayout);
    for( let i = 0; i < jobs.length; i++ ) {
      jobLayoutDimensions.x = Math.max( jobLayoutDimensions.x, jobLayout[jobs[i]][0]+1 );
      jobLayoutDimensions.y = Math.max( jobLayoutDimensions.y, jobLayout[jobs[i]][1]+1 );
    }
  }
  async run( message ) {
    registerFont('eorzea.ttf', { family: 'Eorzea' });
    message.channel.startTyping();
    let res = await xiv.character.search('Aislinn Rei', {server: 'lamia'} );
    if(!res) console.error("[whoami] Res is null? ");
    console.log('Querying...');
    let query = await xiv.character.get(
      res.Results[0].ID, {
        extended: true,
          data : 'FC,CJ',
        //  columns: ['Character.Name','Character.ID','Character.Portrait',
        //  'Character.Title.Name', 'Character.Race.Name', 'Character.Tribe.Name',
        //  'Character.GuardianDeity.Name','Character.GrandCompany.Company.Name',
        //  'Character.GrandCompany.Rank.Name', 'FreeCompany.Name',
        //  'Character.DC', 'Character.Server', 'Character.ClassJobs.*.Level',
        // 'Character.ClassJobs.*.IsSpecialised','Character.ClassJobs.*.Class.Name',
        // 'Character.ClassJobs.*.Class.Icon','Character.ClassJobs.*.Job.Icon',
        // 'Character.ClassJobs.*.UnlockedState.ID', 'Character.ClassJobs.*.Class.ID',
        // 'Character.ClassJobs.*.Job.ID', 'Character.ClassJobs.*.Job.Abbreviation',
        // 'Character.ClassJobs.*.ExpLevelMax', 'Character.ID', 'Character.ActiveClassJob.Job.Abbreviation',
        // 'Character.ClassJobs.*.Class.Abbreviation' ].join(',')
      }
    );
    let char = query.Character;
    let fc = query.FreeCompany;
    console.log("Query:");
    console.log(query);

    const profile = await loadImage( `${char.Portrait}` );
    const canvas = createCanvas(profile.width*2, profile.height);
    const ctx = canvas.getContext('2d');

    const mug = {
      width : Math.floor(profile.width * ( 2/3 )),
      height : Math.floor(profile.height/2),
      x : Math.floor(profile.width/6),
      y : Math.floor(profile.height/12),
    };
    const shortDesc = {
      x: spacing,
      y: spacing + mug.height + spacing,
      width: mug.width,
      get height() { return canvas.height - ( this.y + spacing ) }
    };
    const longDesc = {
      x: mug.width + ( spacing * 3 ),
      y: spacing,
      width: canvas.width - ( mug.width + ( spacing * 5 ) ),
      height: canvas.height - ( spacing * 2 ),
    };

    ctx.drawImage(profile, 0, 0, profile.width, profile.height);
    const clip = ctx.getImageData(mug.x, mug.y, mug.width, mug.height);
    ctx.fillStyle = '#222222';
    // ctx.fillRect(0,0,canvas.width,mug.height + mug.y + spacing);
    ctx.fillRect(0,0, mug.width + spacing + spacing, canvas.height);
    ctx.fillStyle = '#181818';
    // ctx.fillRect(0,bottomDesc.y, canvas.width, canvas.height - (bottomDesc.y) );
    ctx.fillRect(mug.width + spacing + spacing, 0, canvas.width - ( mug.width + spacing + spacing ), canvas.height );
    ctx.putImageData(clip,spacing,spacing);

    // char.ClassJobs.forEach( job => {
    //   WhoAmICommand.drawJob( ctx, job, topDesc.x, topDesc.y, spacing);
    // });

    let imgArgs = [];
    let processed = [];
    var usedSpots = Array.from( Array(jobLayoutDimensions.x), () => new Array(jobLayoutDimensions.y).fill(false) );
    console.log(usedSpots);
    for( let i = 0; i < char.ClassJobs.length; i++ ) {
      let grid = jobLayout[char.ClassJobs[i].Job.Abbreviation];
      // if( !processed.includes(char.ClassJobs[i].Class.Abbreviation) ) {
      //   imgArgs.push({
      //     startX: topDesc.x,
      //     startY: topDesc.y,
      //     gridX: grid[0],
      //     gridY: grid[1],
      //     spacing: spacing,
      //     useJobIcon: false,
      //     job: char.ClassJobs[i]
      //   });
      //   processed.push( char.ClassJobs[i].Class.Abbreviation );
      // }
      // if( char.ClassJobs[i].Class.Abbreviation != char.ClassJobs[i].Job.Abbreviation && !
      // processed.includes( char.ClassJobs[i].Job.Abbreviation ) ) {
      //   let grid = jobLayout[char.ClassJobs[i].Job.Abbreviation];
      //     imgArgs.push({
      //       startX: topDesc.x,
      //       startY: topDesc.y,
      //       gridX: grid[0],
      //       gridY: grid[1],
      //       spacing: spacing,
      //       useJobIcon: true,
      //       job: char.ClassJobs[i]
      //     });
      //     processed.push( char.ClassJobs[i].Job.Abbreviation );
      // }
      //
      console.log(`${char.ClassJobs[i].Job.Abbreviation} : ${char.ClassJobs[i].Job.ClassJobCategory.ID} '${char.ClassJobs[i].Job.ClassJobCategory.Name}'`);
      if( char.ClassJobs[i].Class.Abbreviation != char.ClassJobs[i].Job.Abbreviation &&
      char.ClassJobs[i].Job.ID == char.ClassJobs[i].UnlockedState.ID ) {
        imgArgs.push({
          startX: shortDesc.x,
          startY: shortDesc.y,
          gridX: grid[0],
          gridY: grid[1],
          spacing: spacing,
          useJobIcon: true,
          job: char.ClassJobs[i]
        });
        usedSpots[grid[0]][grid[1]] = true;
      } else if ( char.ClassJobs[i].Class.Abbreviation == char.ClassJobs[i].Job.Abbreviation ||
      char.ClassJobs[i].Job.ID != char.ClassJobs[i].UnlockedState.ID ) {
          imgArgs.push({
            startX: shortDesc.x,
            startY: shortDesc.y,
            gridX: grid[0],
            gridY: grid[1],
            spacing: spacing,
            useJobIcon: false,
            job: char.ClassJobs[i]
          });
          usedSpots[grid[0]][grid[1]] = true;
        }
      }
    ctx.font = `bold ${fontSize}pt sans-serif`;
    ctx.textAlign = 'center';
    const imgTasks = imgArgs.map(WhoAmICommand.prepImage);
    const results = await Promise.all(imgTasks);
    for( let i = 0; i < results.length; i++ ) {
      ctx.fillStyle = '#00000088';
      ctx.fillRect( results[i].x, results[i].y, iconCardWidth, iconCardHeight );
      ctx.fillStyle = results[i].textColor;
      ctx.fillText( results[i].text, results[i].x + iconCardWidth/2, results[i].y + iconYAdjust + ( iconCardHeight - ( fontSize * 0.5 ) ) );
      ctx.drawImage(results[i].image, results[i].x + iconXAdjust, results[i].y + iconYAdjust, iconSize, iconSize );
    }
    console.log(usedSpots);
    for( let x = 0; x < usedSpots.length; x++ ) {
      for( let y = 0; y < usedSpots[x].length; y++ ) {
        if(!usedSpots[x][y]) {
          ctx.fillStyle = '#00000044';
          ctx.fillRect( shortDesc.x + ( x * ( iconCardWidth + spacing ) ), shortDesc.y + ( y * ( iconCardHeight + spacing ) ), iconCardWidth, iconCardHeight );
        }
      }
    }


    let fontsize = 0;
    ctx.fillStyle = '#ffffff44';
    ctx.strokeStyle = '#00000044';
    do {
      fontsize++;
      ctx.font = `${fontsize}px eorzea`;
    } while ( ctx.measureText(char.ID).width < mug.width);
      fontsize = fontsize - 1;
      ctx.font = `${fontsize}px eorzea`;
      ctx.textAlign = 'left';
      // ctx.rotate( ( 90 * Math.PI / 180 ) );
      ctx.fillText(char.ID, 0, mug.height);
      ctx.strokeText(char.ID, 0, mug.height);
      // ctx.rotate( - ( 90 * Math.PI / 180 ) );

      fontsize = 51;
      let widthLim = mug.width / 3;
      do {
        fontsize++;
        ctx.font = `${fontsize}px eorzea`;
      } while ( ctx.measureText(`${char.DC}`).width < widthLim);
      fontsize--;
      ctx.font = `${fontsize}px eorzea`;
      let ascent = ctx.measureText(`${char.DC}`).actualBoundingBoxAscent;
      ctx.fillText(`${char.DC}`, spacing, spacing + spacing + ascent);
      ctx.strokeText(`${char.DC}`, spacing, spacing + spacing + ascent);

      ctx.textAlign = 'right';
      fontsize = 51;
      do {
        fontsize++;
        ctx.font = `${fontsize}px eorzea`;
      } while ( ctx.measureText(`${char.Server}`).width < widthLim);
      fontsize--;

      ctx.font = `${fontsize}px eorzea`;
      ascent = ctx.measureText(`${char.Server}`).actualBoundingBoxAscent;
      ctx.fillText(`${char.Server}`, mug.width + spacing, spacing + spacing + ascent);
      ctx.strokeText(`${char.Server}`, mug.width + spacing, spacing + spacing + ascent);


      // ctx.font = `${fontSize}pt serif`;
      // ctx.textAlign = 'left';
      // ctx.fillStyle = '#aaaaaaff';
      // ascent = ctx.measureText(`Race: ${char.Race.Name}`).actualBoundingBoxAscent;
      // ctx.fillText(`Race: ${char.Race.Name}`, spacing, bottomDesc.y + spacing + ascent );
      WhoAmICommand.putText( ctx, `Race: ${char.Race.Name}, ${char.Tribe.Name}`, `${fontSize}pt serif`,
         'left', '#aaaaaaff', longDesc.x, longDesc.y + spacing );

      const attachment = new MessageAttachment(canvas.toBuffer(), `${char.Name}.png`);

      message.channel.stopTyping();
      message.say(attachment);
  }
  static putText( ctx, text, font, align, color, x, y ) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    let ascent = ctx.measureText(text).actualBoundingBoxAscent;
    ctx.fillText(text, x, y + ascent );
  }
  static prepImage( { startX, startY, gridX, gridY, spacing, useJobIcon, job } ) {
    return ( new Promise( resolve => {
      let icon = useJobIcon ? job.Job.Icon : job.Class.Icon;
      let imgPath = `${appResources}${icon}`;
      let iconImg;
      fs.readFile( imgPath, async (err,data) => {
        iconImg = new Image();
        if( err ) {
          if( err.code == 'ENOENT' ) {
            fs.mkdirSync(  path.dirname( imgPath ), { recursive: true } );

            iconImg = await loadImage(`${host}${icon}`);
            if( iconImg ) {
              let _canvas = createCanvas( iconImg.width, iconImg.height );
              let _ctx = _canvas.getContext('2d');
              _ctx.drawImage(iconImg, 0, 0);
              fs.writeFileSync(imgPath,_canvas.toBuffer());
              console.log(`Wrote image resource '${imgPath}'`);
            }

          } else throw err;
        } else {
          iconImg.src = data;
        }

          let posX = startX + ( gridX * ( iconCardWidth + spacing ) );
          let posY = startY + ( gridY * ( iconCardHeight + spacing ) );

          let text, textColor;
          if( job.Level ) {
            text = `${job.Level}`;
            if( job.ExpLevelMax )
              textColor = '#aaaaaa';
            else
              textColor = '#ff8844';
          } else {
            text = ' — ';
            textColor = '#666666';
          }

          if( job.IsSpecialised ) {
            let tempCanvas = createCanvas(iconSize, iconSize);
            let tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(iconImg, 0, 0, iconSize, iconSize);
            let iconData = tempCtx.getImageData(0,0,tempCanvas.width,tempCanvas.height);
            for( let i = 0; i < iconData.data.length; i+= 4 ) {
              iconData.data[i] = Math.floor(( iconData.data[i] * 0.25 ) + ( 150 * 0.75 ));
              iconData.data[i+1] = Math.floor(( iconData.data[i+1] * 0.25 ) + ( 0 * 0.75 ));
              iconData.data[i+2] = Math.floor(( iconData.data[i+2] * 0.25 ) + ( 175 * 0.75 ));
            }
            tempCtx.putImageData( iconData, 0, 0 );
            iconImg.src = tempCanvas.toBuffer();
          }

        resolve( { image: iconImg, x: posX, y: posY, text: text, textColor: textColor } );
      })
    } ) );
  }
};
