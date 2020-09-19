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
const townIconSize = 18;
const iconSize = 12;//25//50
const iconFontSize = 7;//12//18
const descFontSize = 12;
const topFontSize = 16;
const iconCardWidth = iconSize + 3;//6;//56;
const iconCardHeight = iconSize + (iconFontSize * 2);//20;//80
const guardianIconSize = 18;
const rankIconSize = 18;
const iconXAdjust = ( iconCardWidth - iconSize ) / 2
const iconYAdjust = 1;//3;
const spacing = 3;//5
const jobLayout = {
  //Tanks
  GLA: [  0, 0 ],  PLD: [  0, 0 ],
  MRD: [  1, 0 ],  WAR: [  1, 0 ],
  DRK: [  2, 0 ],
  GNB: [  3, 0 ],
  //Healers
  CNJ: [  5, 0 ],  WHM: [  5, 0 ],
  SCH: [  6, 0 ],
  AST: [  7, 0 ],
  //Mages
  THM: [  9, 0 ],  BLM: [  9, 0 ],
  ACN: [ 10, 0 ],  SMN: [ 10, 0 ],
  RDM: [ 11, 0 ],
  //Phys DPS
  PGL: [  0, 1 ],  MNK: [  0, 1 ],
  LNC: [  1, 1 ],  DRG: [  1, 1 ],
  ROG: [  2, 1 ],  NIN: [  2, 1 ],
  SAM: [  3, 1 ],
  //Ranged DPS
  ARC: [  5, 1 ],  BRD: [  5, 1 ],
  MCH: [  6, 1 ],
  DNC: [  7, 1 ],
  //Limited
  BLU: [ 11, 1 ],
  //Crafters
  CRP: [  0, 2 ],  BSM: [  1, 2 ],  ARM: [  2, 2 ],
  GSM: [  3, 2 ],  LTW: [  4, 2 ],  WVR: [  5, 2 ],
  ALC: [  6, 2 ],  CUL: [  7, 2 ],
  //Gatherers
  MIN: [  9, 2 ],  BTN: [ 10, 2 ],  FSH: [ 11, 2 ]
};
const jobLayoutDimensions = { x: 0, y: 0, width: 0, height: 0 };
var maxMounts = 0;
var maxMinions = 380;

module.exports = class WhoAmICommand extends Command {
  constructor(client){
    super(client, {
      name: 'whoami',
      group: 'xiv',
      memberName: 'whoami',
      description: 'Displays Lodestone data for a given character.',
      args: [
        {
          key: 'args',
          prompt: '',
          type: 'string',
          default: ''
        }
      ]
    });
    //Set the jobLayoutDimensions object to the number of rows and columns,
    // and the width and height of that many iconCards with spacing.
    let jobs = Object.getOwnPropertyNames(jobLayout);
    for( let i = 0; i < jobs.length; i++ ) {
      jobLayoutDimensions.x = Math.max( jobLayoutDimensions.x, jobLayout[jobs[i]][0]+1 );
      jobLayoutDimensions.y = Math.max( jobLayoutDimensions.y, jobLayout[jobs[i]][1]+1 );
    }
    jobLayoutDimensions.width = ( jobLayoutDimensions.x * ( iconCardWidth + spacing ) ) + spacing + spacing;
    jobLayoutDimensions.height = ( jobLayoutDimensions.y * ( iconCardHeight + spacing ) ) + spacing;
    ( async () => {
      let mounts = await xiv.search('',{indexes:"Mount",filters:"Order>=0",limit:1});
      maxMounts = mounts.Pagination.ResultsTotal;
    } )();
    //We technically *could* hardcode this, but making it this way leaves us room
    // to easily reorder and add in other classes down the line.
  }
  async run( message, { args } ) {
    let who = '';
    let where = '';
    if( args ) {
      let split = args.split(' ');
      if( split.length > 2 )
        where = split[2]
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

    registerFont('eorzea.ttf', { family: 'Eorzea' });
    message.channel.startTyping();
    let res = await xiv.character.search(who, where ? {server: where} : {} );
    if(!res) console.error("[whoami] Res is null? Arg(s) : " + args);
    if( res.Results && res.Results.length == 0 ) {
      // Retry in case of a hiccup.
      console.log(`[whoami] Results were empty, retrying... `);
      res = await xiv.character.search(who, where ? {server: where} : {} );
    }
    console.log('Querying...');
    let query = await xiv.character.get(
      res.Results[0].ID, {
        extended: true,
          data : 'FC,CJ,MIMO,AC',
         columns: ['Character.Name','Character.ID','Character.Portrait',
         'Character.Title.Name', 'Character.Race.Name', 'Character.Tribe.Name',
         'Character.GuardianDeity.Name','Character.GrandCompany.Company.Name',
         'Character.GrandCompany.Rank.Name', 'FreeCompany.Name',
         'Character.DC', 'Character.Server', 'Character.ClassJobs.*.Level',
        'Character.ClassJobs.*.IsSpecialised','Character.ClassJobs.*.Class.Name',
        'Character.ClassJobs.*.Class.Icon','Character.ClassJobs.*.Job.Icon',
        'Character.ClassJobs.*.UnlockedState.ID', 'Character.ClassJobs.*.Class.ID',
        'Character.ClassJobs.*.Job.ID', 'Character.ClassJobs.*.Job.Abbreviation',
        'Character.ClassJobs.*.ExpLevelMax', 'Character.ID', 'Character.ActiveClassJob.Job.Abbreviation',
        'Character.ClassJobs.*.Class.Abbreviation', 'Character.Nameday', 'Character.Town.Icon', 'Character.Town.Name', 'Minions.*.Name', 'Mounts.*.Name' ].join(',')
      }
    );
    let char = query.Character;
    let fc = query.FreeCompany;
    let numMinions = query.Minions.length;
    let numMounts = query.Mounts.length;
    console.log("Query:");
    console.log(query);
    //Load the character's portrait
    const profile = await loadImage( `${char.Portrait}` );

    //While we don't need all that empty space, we also have to leave space for the bigger races
    //We keep the 'mugshot' dimensions in one place to better space the rest of the card

    const mug = {
      sliceWidth : Math.floor(profile.width * ( 2/3 )),
      sliceHeight : Math.floor(profile.height/2),
      get width() { return this.sliceWidth / 2 },
      get height() { return this.sliceHeight / 2 },
      sliceX : Math.floor(profile.width/6),
      sliceY : Math.floor(profile.height/12),
      x : spacing,
      y : spacing + topFontSize + spacing
    };

    //Size the main canvas
    const canvas = createCanvas(profile.width*1.25, topFontSize + mug.height + jobLayoutDimensions.height);
    const ctx = canvas.getContext('2d');

    ctx.font = `${topFontSize}pt serif`;
    ctx.textAlign = 'left';
    let text = `Eorzean Adventuring Permit Registration ID No. ${char.ID}`.toUpperCase();
    let measure = ctx.measureText(text);
    console.log(measure);

    const adventurerTag = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent + spacing + spacing
    };
    mug.y = adventurerTag.height;
    canvas.height = mug.height + mug.y + jobLayoutDimensions.height;
    ctx.fillStyle = '#222222';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = `${topFontSize}pt serif`;
    ctx.fillStyle = '#888888ff';
    ctx.fillText(text, adventurerTag.x + spacing, adventurerTag.y + adventurerTag.height - spacing);
    //ShortDesc is for the class list, below the mugshot
    const shortDesc = {
      x: mug.x,
      y: mug.y + mug.height + spacing,
      width: mug.width,
      get height() { return canvas.height - ( this.y + spacing ) }
    };

    //LongDesc is for all the other nonsense, to the right.
    const longDesc = {
      x: mug.x + mug.width + ( spacing * 2 ),
      y: mug.y,
      width: canvas.width - ( mug.width + ( spacing * 4 ) + townIconSize ),
      height: canvas.height - ( spacing * 2 ),
    };

    ctx.fillStyle = '#222222';
    ctx.fillRect(mug.x - spacing,mug.y, mug.x + mug.width + spacing, canvas.height);
    ctx.fillStyle = '#181818';
    ctx.fillRect(mug.x + mug.width + spacing, mug.y, canvas.width - ( mug.width + spacing + spacing + townIconSize ), canvas.height );
    ctx.drawImage(profile, mug.sliceX, mug.sliceY, mug.sliceWidth, mug.sliceHeight, mug.x, mug.y, mug.width, mug.height );

    let imgArgs = [];
    let processed = [];
    var usedSpots = Array.from( Array(jobLayoutDimensions.x), () => new Array(jobLayoutDimensions.y).fill(false) );
    for( let i = 0; i < char.ClassJobs.length; i++ ) {
      let grid = jobLayout[char.ClassJobs[i].Job.Abbreviation];

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
    ctx.font = `bold ${iconFontSize}pt sans-serif`;
    ctx.textAlign = 'center';
    const imgTasks = imgArgs.map(WhoAmICommand.prepImage);
    const results = await Promise.all(imgTasks);
    for( let i = 0; i < results.length; i++ ) {
      ctx.fillStyle = '#00000088';
      ctx.fillRect( results[i].x, results[i].y, iconCardWidth, iconCardHeight );
      ctx.fillStyle = results[i].textColor;
      ctx.fillText( results[i].text, results[i].x + iconCardWidth/2, results[i].y + iconYAdjust + ( iconCardHeight - ( iconFontSize * 0.5 ) ) );
      ctx.drawImage(results[i].image, results[i].x + iconXAdjust, results[i].y + iconYAdjust, iconSize, iconSize );
    }
    for( let x = 0; x < usedSpots.length; x++ ) {
      for( let y = 0; y < usedSpots[x].length; y++ ) {
        if(!usedSpots[x][y]) {
          ctx.fillStyle = '#00000044';
          ctx.fillRect( shortDesc.x + ( x * ( iconCardWidth + spacing ) ), shortDesc.y + ( y * ( iconCardHeight + spacing ) ), iconCardWidth, iconCardHeight );
        }
      }
    }

    ctx.fillStyle = '#ffffff44';
    ctx.strokeStyle = '#00000044';
    ctx.textAlign = 'left';
    ctx.font = WhoAmICommand.fitText( ctx, char.ID, mug.width, 'eorzea' );
    ctx.fillText(char.ID, mug.x, mug.y + mug.height - spacing);
    ctx.strokeText(char.ID, mug.x, mug.y + mug.height - spacing);

    let widthLim = mug.width / 8;
    text = `${char.DC}`;
    measure = ctx.measureText(text);
    ctx.rotate( 90 * Math.PI / 180 );
    let fontsize = 0;
    do {
      fontsize++;
      ctx.font = `${fontsize}px eorzea`;
      measure = ctx.measureText(text);
    } while ( measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent < widthLim);
    fontsize--;
    ctx.font = `${fontsize}px eorzea`;
    let descent = ctx.measureText(text).actualBoundingBoxDescent;
    ctx.fillText(text, (mug.y + spacing), -(spacing + spacing + descent) );
    ctx.strokeText(text, (mug.y + spacing), -(spacing + spacing + descent) );

    ctx.textAlign = 'right';
    text = `${char.Server}`;
    measure = ctx.measureText(text);
    ctx.rotate( -180 * Math.PI / 180 );
    fontsize = 0;
    do {
      fontsize++;
      ctx.font = `${fontsize}px eorzea`;
      measure = ctx.measureText(text);
    } while ( measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent < widthLim);
    fontsize--;

    ctx.font = `${fontsize}px eorzea`;
    descent = ctx.measureText(text).actualBoundingBoxDescent;
    ctx.fillText(text, -( mug.y + spacing), mug.width - descent );
    ctx.strokeText(text, -( mug.y + spacing), mug.width - descent );

      let town = await loadImage( `${host}${char.Town.Icon}` );
      ctx.drawImage( town, -(canvas.height), canvas.width - townIconSize, townIconSize, townIconSize );
      text = `Issued in ${char.Town.Name}`.toUpperCase();
      ctx.font = `${descFontSize}pt serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#888888ff';
      measure = ctx.measureText( text );
      ctx.fillText( text, -(canvas.height - ( townIconSize + spacing ) ), canvas.width - (measure.actualBoundingBoxDescent + spacing) );
      ctx.rotate( 90 * Math.PI / 180 );

      ctx.translate( longDesc.x + ( longDesc.width / 2 ), longDesc.y + ( longDesc.height / 2 ) );
      ctx.rotate( -Math.atan2( longDesc.height, longDesc.width ) );
      ctx.textAlign = 'center';
      ctx.fillStyle = '#88888822';
      text = char.Town.Name;
      ctx.font = WhoAmICommand.fitText( ctx, text, longDesc.width, 'eorzea', -8 );
      measure = ctx.measureText(text);
      ctx.fillText( text, 0, measure.actualBoundingBoxDescent );
      ctx.rotate( Math.atan2( longDesc.height, longDesc.width ) );
      ctx.translate( -( longDesc.x + ( longDesc.width / 2 ) ), -( longDesc.y + ( longDesc.height / 2 ) ) );


      // let guardian = await loadImage(`${host}${char.GuardianDeity.Icon}`);
      // console.log(guardian);
      // ctx.drawImage( guardian, longDesc.x + longDesc.width - guardianIconSize, longDesc.y, guardianIconSize, guardianIconSize );
      //
      // let rank = await loadImage(`${host}${char.GrandCompany.Rank.Icon}`);
      // console.log(rank);
      // ctx.drawImage(rank, mug.x + mug.width - rankIconSize, mug.y + mug.height - rankIconSize, rankIconSize, rankIconSize );

      ctx.fillStyle = '#aaaaaaff';
      let name = char.Name;
      if( char.Title.Name ) {
        if(char.TitleTop)
          name = '\'' + char.Title.Name + '\' ' + name;
        else
          name = name + ' \'' + char.Title.Name + '\'';
      }

      WhoAmICommand.putText( ctx,
        `\nName:\n\t${name}\n`+
        `Nameday:\n\t${char.Nameday}\n`+
        `Race:\n\t${char.Race.Name}, ${char.Tribe.Name}\n`+
        `Guardian:\n\t${char.GuardianDeity.Name}\n`+
        `Rank:\n\t${char.GrandCompany.Rank ? char.GrandCompany.Rank.Name+', '+char.GrandCompany.Company.Name : 'Not enlisted.'}\n`+
        `Minions:\n\t${numMinions} registered of the possible ${maxMinions} ( ${Math.floor(( numMinions / maxMinions ) * 100)}% )\n`+
        `Mounts:\n\t${numMounts} registered of the possible ${maxMounts} ( ${Math.floor(( numMounts / maxMounts ) * 100)}% )`,
        `${descFontSize}pt serif`,
        'left', '#aaaaaaff', longDesc.x, longDesc.y + spacing );
      // WhoAmICommand.putText( ctx, `Guardian: ${char.GuardianDeity.Name}`, `${descFontSize}pt serif`,
      //   'left', '#aaaaaaff', longDesc.x, longDesc.y + spacing + descFontSize);



      const attachment = new MessageAttachment(canvas.toBuffer(), `${char.Name}.png`);

      message.channel.stopTyping();
      message.say(attachment);
  }
  static fitText( ctx, text, width, fontFamily, mod ) {
    if( !mod || mod === undefined )
      mod = -1;
    let oldFont = ctx.font;
    let fontsize = 0;
    do {
      fontsize++;
      ctx.font = `${fontsize}px ${fontFamily}`;
    } while ( ctx.measureText(text).width < width );
    fontsize = fontsize + mod;
    ctx.font = oldFont;
    return `${fontsize}px ${fontFamily}`;
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
