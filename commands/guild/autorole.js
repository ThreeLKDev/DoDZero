require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });

module.exports = class AutoRoleCommand extends Command {
  constructor(client){
    super(client, {
      name: 'autorole',
      group: 'guild',
      memberName: 'autorole',
      description: 'Ensure all FC members\' roles reflect their ranks.',
      guildOnly: true,
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
        let skipped = message.guild.autoRole.skipped;
        if( args && ( args === 'debug' || args === 'report' ) ) {
          console.log("Autorole debug");
          if( skipped.missingNickname.length + skipped.invalidCharID.length +
             skipped.outrank.length + skipped.away.length > 0 ) {
               message.guild.sayToLog(`Last autorole skipped:\n`
                + `'Missing' nicknames: `
                + `${(skipped.missingNickname.length > 0
                  ? `\n\t` + skipped.missingNickname.join(`\n\t`)
                  : `none`)}\n`
                + `Invalid CharIDs: `
                + `${(skipped.invalidCharID.length > 0
                  ? `\n\t` + skipped.invalidCharID.join(`\n\t`)
                  : `none`)}\n`
                + `Away: `
                + `${(skipped.away.length > 0
                  ? `\n\t` + skipped.away.join(`\n\t`)
                  : `none`)}\n`
                + `Outrank: `
                + `${(skipped.outrank.length > 0
                  ? `\n\t` + skipped.outrank.join(`\n\t`)
                  : `none`)}`);
             } else {
               console.log("Nothing to report.");
               message.guild.sayToLog("Nothing to report.");
             }
          return;
        }
        console.log('[autorole] Task running...');
        message.guild.sayToLog("Starting autorole...");
        console.log("Clearing old 'skipped' tracker...")
        skipped.missingNickname.length = 0;
        skipped.invalidCharID.length = 0;
        skipped.outrank.length = 0;
        skipped.away.length = 0;
        let botRolePosition = 0;
        for( let botRole of message.guild.me._roles ){
          botRolePosition = Math.max( botRolePosition, message.guild.roles.cache.get( botRole ).rawPosition );
        }

        let query = await xiv.freecompany.get(message.channel.guild.freeCompany.ID, {
          extended: true, data: 'FCM', columns: ['FreeCompanyMembers.*.Rank','FreeCompanyMembers.*.ID','FreeCompanyMembers.*.Name', 'FreeCompany.Server'].join(',')});
        let fcMembers = query.FreeCompanyMembers;
        console.log(query);
        let guildMembers = message.guild.members.cache.values(); //value.user.id, value.nickname
        let roles = message.guild.roles.cache.values(); // value.name, value.rawPosition
        let roleMap = new Map();
        for( let role of roles ){
          roleMap[role.name] = role;
        }
        let db = this.client.sqlite.getGuildDB(message.guild.id);
        db.all(`SELECT memberID, characterID FROM members`, async (err,rows) => {
          if(err) return console.error(err.message);
          let updateDB = false;
          let idMap = new Map();
          for( let { memberID, characterID } of rows ) {
            idMap.set(memberID,characterID);
          }
          let count = 1;
          let max = message.guild.members.cache.size;
          let numRemovals = 0;
          let numAdditions = 0;
          let numNoNick = 0;
          let numNoChar = 0;
          let numAway = 0;
          let numOutrank = 0;
          let numTotalChanges = 0;
          let numTotalSkipped = 0;
          let changelog = "";
          for( let member of guildMembers ){
            console.log(`[autorole] [ ${count++} / ${max} ]`);
            if(member.user.bot) {
              console.log(`[autorole] Bot, skipping...`);
              continue;
            }
            let charID = idMap.get(member.user.id);
            if( !charID ) {
              if( member.nickname == null ) {
                console.log(`[autorole] CharID for '${member.user.username}' not in database. No nickname, skipping.`);
                numNoNick++;
                skipped.missingNickname.push(member.user.username);
                continue;
              }
              console.log(`[autorole] CharID for '${member.nickname}' not in database, looking up...`);
              console.log(`[autorole] Searching for '${member.nickname}' in '${query.FreeCompany.Server}'`);
              let search = await xiv.character.search( ""+member.nickname, { server: query.FreeCompany.Server } );
              if( search.Results && search.Results.length == 0 ) {
                console.log(`[autorole] Results empty, retrying...`);
                search = await xiv.character.search( ""+member.nickname, { server: query.FreeCompany.Server } );
              };
              if( search.Results && search.Results.length > 0 ) {
                let char = await xiv.character.get( search.Results[0].ID, { data: "FC", columns: 'FreeCompany.ID'} );
                if( char && char.FreeCompany && char.FreeCompany.ID && char.FreeCompany.ID == message.guild.freeCompany.ID )
                  if( search.Results[0].ID == null && search.Results[0].ID == undefined ) {
                    console.error(`[autorole] Sudden null ID? Dump: `);
                    console.error(char);
                    console.error(search);
                  }
                  charID = search.Results[0].ID;
                  idMap.set(member.user.id, search.Results[0].ID.toString());
                  updateDB = true;
                  console.log(`[autorole] Found assumed character ID [${search.Results[0].ID}], flagged to update database.`);
              } else console.log('[autorole] Search returned empty.');
            }
            if(!charID) {
              console.log('[autorole] Null CharID, skipping...');
              numNoChar++;
              skipped.invalidCharID.push(member.nickname);
              continue;
            }
            console.log('[autorole] Checking CharID against known members...');
            for( let i = 0; i < fcMembers.length; i++ ) {
              if(fcMembers[i].ID == charID) {
                let role = roleMap[fcMembers[i].Rank];
                if( role == null ) {
                  role = roleMap[fcMembers[i].Rank + "s"];
                  if( role == null ) {
                    console.error(`[autorole] Can't match FC Rank '${fcMembers[i].Rank}' to any role.`);
                    message.guild.sayToLog(`Error in autorole: Can't match FC Rank '${fcMembers[i].Rank}' to any role.`);
                  }
                }
                if( role != null ) {
                  console.log(`[autorole] Appropriate role found for FC Rank ${fcMembers[i].Rank}`);
                  let rolePosition = role.rawPosition;
                  if( role.rawPosition > botRolePosition ) {
                    console.log(`[autorole] Role for FC Rank ${fcMembers[i].Rank} [ ${role.rawPosition} ] greater than bot [ ${botRolePosition} ]`);
                  }
                  let memberRoles = message.guild.members.cache.get( member.user.id )._roles;
                  let hasRole = false;
                  let hasAwayRole = false;
                  for( let memberRole of memberRoles ){
                    for( let awayRole of message.guild.autoRole.awayRoles ){
                      if( awayRole.id == role.id ) {
                        hasAwayRole = true; // Only applies if their in-game FC Rank is an Away Role
                        numAway++;
                        skipped.away.push(member.nickname);
                        break;
                      }
                    }
                    if( memberRole == role.id ) {
                      hasRole = true;
                      continue;
                    }
                    for( let progressionRole of message.guild.autoRole.progressionRoles ){
                      if( progressionRole.id == memberRole && !hasAwayRole ){
                        if( role.rawPosition > botRolePosition ) {
                          numOutrank++;
                          console.log(`[autorole] Role '${progressionRole.name}' should be removed from ${member.nickname ? member.nickname : member.user.username}`);
                          message.guild.sayToLog(`**Role '${progressionRole.name}' should be removed from ${member.nickname ? member.nickname : member.user.username}**`);
                        } else {
                          numRemovals++;
                          console.log(`[autorole] Removing role '${progressionRole.name}' from ${member.nickname ? member.nickname : member.user.username}`);
                          message.guild.sayToLog(`*Removing role '${progressionRole.name}' from ${member.nickname ? member.nickname : member.user.username}*`);
                          member.roles.remove( message.guild.roles.cache.get(progressionRole.id) );
                        }
                        break;
                      }
                    }
                  }
                  if( !hasRole ) {
                    if( role.rawPosition > botRolePosition ){
                      numOutrank++;
                      skipped.outrank.push(member.nickname);
                      console.log(`[autorole] Role '${role.name}' should be given to ${member.nickname ? member.nickname : member.user.username}`);
                      message.guild.sayToLog(`**Role '${role.name}' should be given to ${member.nickname ? member.nickname : member.user.username}**`);
                    } else {
                      numAdditions++;
                      console.log(`[autorole] Adding role '${role.name}' to ${member.nickname ? member.nickname : member.user.username}`);
                      message.guild.sayToLog(`*Adding role '${role.name}' to ${member.nickname ? member.nickname : member.user.username}*`);
                      member.roles.add(role);
                    }
                  }
                }
                fcMembers.splice(i,1);
                break;
              }
            }
          }
          if( updateDB ) {
            console.log(`[autorole] Updating database...`);
            let it = idMap.entries();
            for(let result = it.next(); !result.done; result = it.next()) {
              console.log(`[autorole] Inserting <${result.value[0]},${result.value[1]}>`);
              db.run(`INSERT OR REPLACE INTO members (memberID, characterID) VALUES ( ?, ? )`, result.value,
              ( err ) => { return err ? console.error(err.message) : null } );
            }
          }
          console.log('[autorole] Task finished.');
          numTotalChanges = numAdditions + numRemovals;
          numTotalSkipped = numNoNick + numNoChar + numAway + numOutrank;
          message.guild.sayToLog(`Autorole: Finished. Changelog:\n`
            + `\tMade ${numTotalChanges} change${ numTotalChanges == 1 ? '' : 's' }`
            + ( numTotalChanges > 0 ? ` :\n`
              + ( numAdditions > 0 ? `\t\t-> ${numAdditions} additions\n` : `` )
              + ( numRemovals > 0 ? `\t\t-> ${numRemovals} removals\n` : `` )
            : `.\n` )
            + `\tSkipped ${ (numTotalSkipped == 1 ? "1 member" : `${numTotalSkipped} members` ) }`
            + ( numTotalSkipped > 0 ? ` :\n`
              + ( numNoNick > 0 ? `\t\t-> ${numNoNick} missing nickname${ numNoNick == 1 ? '' : 's'}\n` : `` )
              + ( numNoChar > 0 ? `\t\t-> ${numNoChar} invalid/null charID (couldn't match to any known FC member)\n` : `` )
              + ( numAway > 0 ? `\t\t-> ${numAway} in designated Away role(s)\n` : `` )
              + ( numOutrank > 0 ? `\t\t-> ${numOutrank} in role(s) that outrank me` : `` )
            : '.' ) );
          db.close( (err) => { return err ? console.error(err.message) : console.log('Members.db closed.') });
        });
      }
};
