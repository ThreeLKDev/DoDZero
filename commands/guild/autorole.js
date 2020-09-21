require('dotenv').config();
const { Command } = require('discord.js-commando');
const XIVAPI = require('xivapi-js');
const xiv = new XIVAPI({ private_key: process.env.XIVAPI });
const cron = require('node-cron');

module.exports = class AutoRoleCommand extends Command {
  constructor(client){
    super(client, {
      name: 'autorole',
      group: 'guild',
      memberName: 'autorole',
      description: 'Ensure all FC members\' roles reflect their ranks.',
      guildOnly: true,
      args: []
    });
  }
  async run( message ) {
        console.log('[autorole] Task running...');
        message.guild.sayToLog("Starting autorole...");

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
                  let memberRoles = message.guild.members.cache.get( member.user.id )._roles;
                  let hasRole = false;
                  let hasAwayRole = false;
                  for( let memberRole of memberRoles ){
                    for( let awayRole of message.guild.autoRole.awayRoles ){
                      if( awayRole.id == role.id ) {
                        hasAwayRole = true;
                        numAway++;
                        break;
                      }
                    }
                    if( memberRole == role.id ) {
                      hasRole = true;
                      continue;
                    }
                    for( let progressionRole of message.guild.autoRole.progressionRoles ){
                      if( progressionRole.id == memberRole && !hasAwayRole ){
                        console.log(`[autorole] Removing role '${progressionRole.name}' from ${member.nickname ? member.nickname : member.user.username}`);
                        numRemovals++;
                        let errored = false;
                        try {
                          member.roles.remove( message.guild.roles.cache.get(progressionRole.id) );
                        } catch( error ){
                          console.error( error );
                          errored = true;
                          message.guild.sayToLog(`Autorole: Can't remove role '${progressionRole.name}' from ${member.nickname ? member.nickname : member.user.username} (insufficient permission?)`);
                        }
                        if(!errored)
                          message.guild.sayToLog(`Autorole: Removing role '${progressionRole.name}' from ${member.nickname ? member.nickname : member.user.username}`);
                        break;
                      }
                    }
                  }
                  if( !hasRole ) {
                    numAdditions++;
                    console.log(`[autorole] Adding role '${role.name}' to '${member.nickname ? member.nickname : member.user.username}'`);
                    let errored = false;
                    try {
                      member.roles.add(role);
                    } catch( error ){
                      console.log(error);
                      errored = true;
                      message.guild.sayToLog(`Autorole: Can't add role '${role.name}' to ${member.nickname ? member.nickname : member.user.username} (insufficient permission?)`);
                    }
                    if(!errored)
                      message.guild.sayToLog(`Autorole: Adding role '${role.name}' to ${member.nickname ? member.nickname : member.user.username}`);
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
          message.guild.sayToLog(`Autorole: Finished. Changelog: \n\tMade ${numAdditions + numRemovals} changes -> ${numAdditions} additions + ${numRemovals} removals\n\t${numNoNick + numNoChar + numAway} skipped -> ${numNoNick} missing nicknames + ${numNoChar} invalid/null charID (couldn't match to any known FC member) + ${numAway} in designated Away role(s)`);
          db.close( (err) => { return err ? console.error(err.message) : console.log('Members.db closed.') });
        });
      }
};
