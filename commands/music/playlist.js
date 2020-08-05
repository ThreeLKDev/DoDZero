  require('dotenv').config();
  const { Command } = require('discord.js-commando');
  const { MessageEmbed, MessageCollector } = require('discord.js');
  const fs = require('fs');
  const prefix = process.env.PREFIX;
  const owner = process.env.OWNER;
  const ytdl = require('ytdl-core');
  const Youtube = require('simple-youtube-api');
  const youtubeAPI = process.env.YOUTUBE;
  const youtube = new Youtube(youtubeAPI);

  module.exports = class PlaylistCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'playlist',
      group: 'music',
      memberName: 'playlist',
      aliases: ['plist'],
      description: 'Playlist controls. Say \'playlist help\' for a full rundown on how this command works.',
      args: [
        {
          key: 'arg0',
          prompt: 'Try \'help\' for a rundown on how to use this command!',
          type: 'string',
          default: 'info'
        },
        {
          key: 'arg1',
          prompt: '',
          default: '',
          type: 'string'
        }
      ]
    });
  }

  async run( message, { arg0, arg1 } ){
    var musicData;
    if(message.guild) {
      console.log('Guild present.');
      musicData = message.guild.musicData;
    } else {
      console.log('No guild, DM?');
      return;
    }
    const dir = `./guilds/${message.guild.id}/playlists`;
    if(arg0 == 'help') { // ---------------------------------------------- Help
      message.author.send(`Playlist command usage cheatsheet:
      \t\`${prefix}playlist <info|c|create|l|load|a|add|play|list|e|edit|s|save|delete> <args>\`
      Command alias is 'plist'

      NOTE: THIS COMMAND IS STILL A WORK IN PROGRESS. Most if not all of this is not fully implemented yet.
      Breakdown:
      \t**${prefix}playlist info**
      Lists info for currently loaded playlist (if one is loaded).

      \t**${prefix}playlist create** *<playlist_name>*
      Will create a new playlist with the given name. If a playlist is not currently loaded, will set this new playlist as the loaded playlist. Also polls the user for a brief description of the playlist.

      \t**${prefix}playlist load** *<playlist_name>*
      Will load the named playlist, if one exists. If not, will prompt to create instead.

      \t**${prefix}playlist add**
      Adds the current song (if one is playing) to the currently loaded playlist (if one is loaded).

      \t**${prefix}playlist add** *<song>*
      If the given 'song' is a valid YouTube URL, adds it to the currently loaded playlist (if one is loaded).
      If it's *not*, treats it as a search query and returns the top 5 results. The chosen result is added instead.

      \t**${prefix}playlist play**
      Adds all songs in the playlist to the queue, and starts playing. Must be in a voice channel.

      \t**${prefix}playlist play shuffle**
      Adds all songs in a random order to the queue, and starts playing. Must be in a voice channel.

      \t**${prefix}playlist list**
      Lists all of the songs in the currently loaded playlist (if one is loaded).

      \t**${prefix}playlist edit** *<songs|description|help>*
      Allows the user to edit the contents of the currently loaded playlist.
      Calling with 's', 'song', or 'songs' will display a numbered list of the songs in this playlist, allowing the user to Move, Copy, or Remove the song.
      Calling with 'd', 'desc', or 'description' displays the current description of the playlist, and prompts the user to input a new one.
      Calling with 'h' or 'help' will output a detailed explanation of how the edit command works.

      \t**${prefix}playlist save**
      Saves the currently loaded playlist (if one is loaded) to file.

      \t**${prefix}playlist delete**
      Self-explanatory, asks for confirmation before removing the currently-loaded playlist.`);
  } else if( arg0 === 'info' ){ // --------------------------------------- Info
    if( message.guild.musicData.playlist && message.guild.musicData.playlist != 'undefined' ) {
      const embed = new MessageEmbed()
        .setColor('#e9f931')
        .setTitle(message.guild.musicData.playlist.name)
        .addField(`${message.guild.musicData.playlist.songs.length} Song(s)`,message.guild.musicData.playlist.description);
      if(message.guild.musicData.playlistModified)
        embed.setFooter(`This playlist has unsaved changes. Use \`${prefix}playlist save\` to commit them to file.`);
      message.channel.send({embed});
    } else return message.say(`No playlist active! Try \`${prefix}playlist help\` if you need a rundown on this command.`);
  } else if( arg0 === 'create' || arg0 === 'c' ){ // ------------------- Create
      if( arg1 === null || arg1 === '' ) return message.say(`Command usage is \`${prefix}playlist create <playlist_name>\``);
      if( message.guild.musicData.playlist && message.guild.musicData.playlist != 'undefined' ) {
        if( message.guild.musicData.playlist.name === arg1 )
          return message.say('A playlist with that name already exists, and is currently in use!');
        if( message.guild.musicData.playlistModified ) {
          message.say('Saving current playlist first...');
          await this.client.registry.commands.get('playlist').run(message, { arg0: 'save', arg1: 'silent' } );
        }
      }
      console.log(`Trying to create playlist '${arg1}'`);
      let name = PlaylistCommand.sanitizeFilename(arg1);
      let description = '';
      var descPrompt = await message.channel.send(`Please input a description for the new playlist. This can be changed later using the command \`${prefix}playlist edit description\``);
      const file = `${dir}/${name}.json`;
      message.channel.awaitMessages( () => true, { max: 1, time: 30000, errors: ['time'] } ) //TODO: Ensure only the playlist caller sets desc?
        .then( (response) => {
          description = response.first().content;
          let playlist =
              {
                "name" : arg1,
                "description" : description,
                "songs" : []
              };
          fs.readFile(file,'utf-8', (err)=> {
            if(err){
              if( err.code === 'ENOENT' ) {

                fs.writeFile(file,JSON.stringify(playlist,null,4),(err2)=> {
                  if(err2) throw err2;
                  console.log(`Playlist file '${name}.json' created for ${message.guild.id}.`);
                });
              } else return message.say('A playlist with that name already exists!');
            }
          });
          message.say("Playlist created and set as active.");
          message.guild.musicData.playlist = playlist;
          // Optional clutter cleanup
          descPrompt.delete();
          response.first().delete();
        })
        .catch( function() {
          if(descPrompt && !descPrompt.deleted) {
            descPrompt.delete();
          }
        });
    } else if( arg0 === 'load' || arg0 === 'l' ) { // -------------------- Load
        if( arg1 === null || arg1 === '' ) return message.say(`Command usage is \`${prefix}playlist load <playlist_name>\``);
        const name = PlaylistCommand.sanitizeFilename(arg1);
        const file = `${dir}/${name}.json`;
        await fs.readFile(file,'utf-8',async (err,data)=>{
          if(err){
            if(err.code === 'ENOENT') {
              return message.say(`Couldn't find a playlist by that name. Try \`${prefix}playlist create ${arg1}\` to make it.`);
            } else throw err;
          }
          if( message.guild.musicData.playlist && message.guild.musicData.playlist != 'undefined' ) {
            if( message.guild.musicData.playlistModified ) {
              message.say('Saving current playlist first...');
              await this.client.registry.commands.get('playlist').run(message, { arg0: 'save', arg1: 'silent' } );
            }
          }
          message.guild.musicData.playlist = JSON.parse(data.toString());
          return message.say(`Playlist '${message.guild.musicData.playlist.name}' loaded and ready!`);
        });
    } else if( arg0 === 'add' || arg0 === 'a' ) { // ---------------------- Add
      if( !message.guild.musicData.playlist || message.guild.musicData.playlist == 'undefined')
        return message.say('No playlist currently loaded.');
      if( !arg1 || arg1 == '' || arg1 == 'undefined' )
        return message.say(`Invalid/null argument. Command usage is \`${prefix}playlist add <search terms OR valid YouTube url>\``);

        //Youtube playlist url
        if(arg1.match(/^(?!.*\?.*\bv=)https:\/\/www\.youtube\.com\/.*\?.*\blist=.*$/)) {
          const playlist = await youtube.getPlaylist(arg1).catch( ()=>{
            return message.say('Playlist is either private or it does not exist.');
          });
          const videosObj = await playlist.getVideos().catch( ()=>{
            return message.say('There was a problem getting one of the videos in the playlist.');
          });
          for( let i = 0; i < videosObj.length; i++){
            if(videosObj[i].raw.status.privacyStatus == 'private')
              continue;
            else {
              try {
                const video = await videosObj[i].fetch();
                message.guild.musicData.playlist.songs.push( {
                  title: video.title,
                  videoID: video.id
                });
              } catch (err) {
                console.error(err);
              }
            }
          }
          return message.say(`Added ${videosObj.length} song(s)`);
        }

        //Matches any YT url
        if (arg1.match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
          arg1 = arg1
            .replace(/(>|<)/gi, '')
            .split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
          const id = arg1[2].split(/[^0-9a-z_\-]/i)[0];
          const video = await youtube.getVideoByID(id).catch( ()=>{ return message.say('There was a problem checking the video you provided'); });
          if(video.raw.snippet.liveBroadcastContent === 'live'){
            return message.say(`Can't add livestreams to a playlist, that's a crime. Alerting authorities...`);
          }
          message.guild.musicData.playlist.songs.push( PlaylistCommand.constructPlaylistEntry(video));
          return message.say('Added.');
        }

        //Otherwise, treat as search terms
        const videos = await youtube.searchVideos(arg1, 5).catch(async () => {
          await message.say('There was a problem searching for videos.');
        });

        if(!videos || videos.length < 5) {
          return message.say(`I had some trouble finding what you were looking for, please try again or be more specific`);
        }
        const vidNameArr = [];
        for(let i = 0; i < videos.length; i++) {
          vidNameArr.push(`${i+1}: ${videos[i].title}`);
        }
        vidNameArr.push('exit');
        const embed = new MessageEmbed()
          .setColor('#e9f931')
          .setTitle('Choose a song by commenting a number between 1 and 5')
          .addField('Song 1', vidNameArr[0])
          .addField('Song 2', vidNameArr[1])
          .addField('Song 3', vidNameArr[2])
          .addField('Song 4', vidNameArr[3])
          .addField('Song 5', vidNameArr[4])
          .addField('Cancel', 'Cancel');
        var songEmbed = await message.channel.send({ embed });
        message.channel.awaitMessages(  msg => msg.content > 0 && msg.content < 6 || msg.content === 'cancel', { max: 1, time: 60000, errors: ['time'] } )
          .then( (response) => {
            const videoIndex = parseInt(response.first().content);
            if(response.first().content === 'cancel') return songEmbed.delete();
            youtube.getVideoByID(videos[videoIndex - 1].id)
              .then( (video) => {
                message.guild.musicData.playlist.songs.push(PlaylistCommand.constructPlaylistEntry(video));
                response.first().delete();
                songEmbed.delete();
                return message.say('Added.');
              });
          });
    } else if( arg0 === 'play' ){ // ------------------------------------- Play
      const voiceChannel = message.member.voice.channel;
      if(!voiceChannel) return message.say('Join a voice channel and try again');
      let numChannels = message.guild.channelWatch.voice.length;
      if( numChannels > 0 ) {
        let isVCWhitelisted = false;
        for( let j = 0; j < numChannels; j++ ){
          if( voiceChannel.id == message.guild.channelWatch.voice[j] ) {
            isVCWhitelisted = true;
            break;
          }
        }
        if(!isVCWhitelisted) return message.say('Your voice channel isn\'t whitelisted.');
      }
      const len = message.guild.musicData.playlist.songs.length;
      for( let i = 0; i < len; i++ ) {
        const video = await youtube.getVideoByID(
          message.guild.musicData.playlist.songs[i].videoID
        );
        message.guild.musicData.queue.push( PlaylistCommand.constructSongObj(video, voiceChannel) );
      }
      if(message.guild.musicData.isPlaying == false){
        message.guild.musicData.isPlaying = true;
        PlaylistCommand.playSong(message.guild.musicData.queue, message);
      } else {
        return message.say(`Playlist - :musical_note:  ${message.guild.musicData.playlist.name} :musical_note: has been added to queue`);
      }
    } else if( arg0 === 'list' ){ // ------------------------------------- List
      fs.readdir(dir, async (err, files) => {
        if(err) {
          if(err.code === 'ENOENT')
            return message.say(`No playlists exist! Why not make one?`);
          else throw err;
        }
        if(files.length <= 0)
          return message.say(`No playlists exist! Why not make one?`);

        var playlists = [];
        await files.forEach(file=>{
          playlists.push(JSON.parse(fs.readFileSync(dir+'/'+file)));
        });

        let size = playlists.length;
        let maxSize = 8; //Song display limit
        let limit = (size < maxSize ) ? size : maxSize;
        const embed = new MessageEmbed()
          .setColor('#e9f931')
          .setTitle(`${playlists.length} Playlists`);
        for( let i = 0; i < limit; i++ ){
          embed.addField(
            `${playlists[i].name} [${playlists[i].songs.length} Song(s)]`,
            `\t${playlists[i].description}`
          );
        }
        var listEmbed = await message.channel.send({embed});
        if( size > maxSize ) {
          let page = 0;
          let maxPage = Math.ceil(size / maxSize);
          listEmbed.react('❌')
          .then(listEmbed.react('◀️'))
          .then(listEmbed.react('▶️'))
          .then( ()=> {
            const collector = listEmbed.createReactionCollector( (reaction,user)=>!user.bot, { time: 90000 } );
            collector.on('collect', async (reaction,user) => {
              listEmbed.reactions.cache.get(reaction.emoji.name).users.remove(user.id);
              if(reaction.emoji.name === '❌') {
                collector.stop();
              } else if(reaction.emoji.name === '◀️') {
                page--;
                if(page < 0) page = maxPage - 1;
                embed.setTitle(`Playlists - Page ${page+1} of ${maxPage}`);
                embed.fields = [];
                for( let i = page * maxSize; i < (page + 1) * maxSize; i++ ){
                  if(playlists[i] && playlists[i] != 'undefined'){
                    embed.addField(
                      `${playlists[i].name} [${playlists[i].songs.length} Song(s)]`,
                      `\t${playlists[i].description}`
                    );
                  }
                }
                listEmbed.edit({embed});
              } else if(reaction.emoji.name === '▶️') {
                page++;
                if(page >= maxPage) page = 0;
                embed.setTitle(`Playlists - Page ${page+1} of ${maxPage}`);
                embed.fields = [];
                for( let i = page * maxSize; i < (page + 1) * maxSize; i++ ){
                  if(playlists[i] && playlists[i] != 'undefined'){
                    embed.addField(
                      `${playlists[i].name} [${playlists[i].songs.length} Song(s)]`,
                      `\t${playlists[i].description}`
                    );
                  }
                }
                listEmbed.edit({embed});
              }
            });
            collector.on('end',collected=>{
              if(listEmbed && !listEmbed.deleted )
                listEmbed.delete();
            });
          });

        } else {
          setTimeout( ()=> {
            if(listEmbed && !listEmbed.deleted)
              listEmbed.delete();
          }, 90000);
        }
      });
    } else if( arg0 === 'edit' || arg0 === 'e' ){ // --------------------- Edit
      if( !message.guild.musicData.playlist || message.guild.musicData.playlist == "undefined" )
        return message.say( "No playlist currently selected." );
      if(!arg1 || arg1 == 'undefined')
        return message.say(`Command usage is \`${prefix}playlist edit <songs|description|help>\``);
      arg1 = arg1.toLowerCase();
      let maxSize = 8; // Maximum song display
      if('help'.startsWith(arg1)){
        //Help
        return message.say(`Command usage is \`${prefix}playlist edit <songs|description|help>\`
          \`${prefix}playlist edit description\`
          \tDisplays the description of the currently-selected playlist, then prompts you for a new one.

          \`${prefix}playlist edit songs\`
          \tLists all songs in the currently-selected playlist, in a reaction-controlled ${maxSize}-entry page. Each song listed will have a letter beside its name.
          All subsequent messages from you will be processed as instructions, in the form of:
          \`<instruction> <selector>\`
          <selector> is the two-character code to the left of the song, e.g. 0b
          <instruction> is any one of:
          **copy**
          \tDuplicates the song. Give a second <selector> to direct *where* the copy will be placed. The copy will push the list 'down' from its insertion point.
          **delete** — Deletes the song's entry in the playlist
          **move** — Moves the song to another location. Requires a second <selector> after the first, indicating the location to move to. Pushes the list 'down' from its insertion point.
          **swap** — Swaps two songs on the list. Requires a second <selector> after the first.
          When you're done, just say 'stop'.`);
      } else if('songs'.startsWith(arg1)) {
        //Edit songs
        let size = message.guild.musicData.playlist.songs.length;
        // Keep maxSize around 8 until a method for quicker ordered auto-reactions is made
        //TODO: lookup above
        let limit = ( size < maxSize ) ? size : maxSize;
        let msgCollector;
        let errMsg = null;
        const songsListEmbed = new MessageEmbed()
          .setColor('#e9f931')
          .setTitle(message.guild.musicData.playlist.name);
        for(let i = 0; i < limit; i+=2){
          //Consume 2 per pass because Embed fields require a title and description,
          //but we only have 1 piece of displayable data (title, no point in showing id)
          songsListEmbed.addField( '[' + (i).toString(16) + ']' + message.guild.musicData.playlist.songs[i].title,
            message.guild.musicData.playlist.songs[i+1]
              ? '['+ (i+1).toString(16) + ']' + message.guild.musicData.playlist.songs[i+1].title
              : '-- - -- - --'
          );
        }
        var controlsEmbed = new MessageEmbed({
          color: 0xaabbcc,
          title: 'Controls and Information',
          fields: [
            {
              name: 'Controls',
              value: `*<instruction> <selector>*
              Valid instructions: **copy**, **delete**, **move**, **swap**
              Example: \`swap 0 1b\`
              Click the ❌ to close. All changes are kept in working memory until saved.`,
              inline: false
            },
            {
              name: 'Last Instruction',
              value: 'None',
              inline: false
            }
          ]
        });
        var controls = await message.channel.send({ embed: controlsEmbed });

        var songsList = await message.channel.send(songsListEmbed);
        let songsListUpdate = function(whichPage){
          size = message.guild.musicData.playlist.songs.length;
          limit = ( size < maxSize ) ? size : maxSize;
          songsListEmbed.setTitle(`${message.guild.musicData.playlist.name} - Page ${whichPage+1} of ${Math.ceil( size / limit)}`);
          songsListEmbed.fields = [];
          for( let i = whichPage * maxSize; i < (whichPage + 1) * limit; i+=2 ) {
            songsListEmbed.addField(
              `[${(i).toString(16)}]${message.guild.musicData.playlist.songs[i].title}`,
              message.guild.musicData.playlist.songs[i+1]
                ? `[${(i+1).toString(16)}]${message.guild.musicData.playlist.songs[i+1].title}`
                : `-- - -- - --`
            );
          }
          songsList.edit(songsListEmbed);
        };

        let page = 0;
        let maxPage = Math.ceil( size / maxSize );
        await songsList.react('❌');
        if( size > maxSize )
          await songsList.react('◀️');

        if( size > maxSize )
          await songsList.react('▶️');

        await songsList.react('💾')
        .then( ()=> {
          const collector = songsList.createReactionCollector( (reaction, user) => !user.bot, { time: 90000 } );
          collector.on('collect', async (reaction, user) => {
            songsList.reactions.cache.get(reaction.emoji.name).users.remove(user.id);
            if(reaction.emoji.name === '❌'){
              collector.stop();
            }
            if(reaction.emoji.name === '◀️' || reaction.emoji.name === '▶️') {
              if(reaction.emoji.name === '◀️')
                page = (page - 1 < 0) ? maxPage - 1 : page - 1;
              else
                page = (page + 1 >= maxPage) ? 0 : page + 1;
              songsListUpdate(page);
            }
            if(reaction.emoji.name === '💾'){
              await this.client.registry.commands.get('playlist').run(message, { arg0: 'save', arg1: 'silent' } );
              songsListEmbed.title += ' - Saved!';
              songsList.edit({embed : songsListEmbed});
              setTimeout( ()=> {
                if(songsList && !songsList.deleted) {
                  songsListEmbed.title = songsListEmbed.title.split(' - Saved!')[0];
                  songsList.edit({embed : songsListEmbed});
                }
              }, 5000);
            }
          });
          collector.on('end',collected=>{
            if(songsList && !songsList.deleted)
              songsList.delete();
            if(controls && !controls.deleted)
              controls.delete();
            if(errMsg && !errMsg.deleted) {
              errMsg.delete();
              errMsg == null;
            }
            msgCollector.stop();
          });
        });

        msgCollector = new MessageCollector( message.channel, msg=>msg.author === message.author, { idle: 60000 } );
        msgCollector.on('collect', async function(msg) {
          let action = 'Unknown.'
          if( errMsg ) { //Leftover errMsg from last pass
            errMsg.delete();
            errMsg = null;
          }
          let arg = msg.content.trim().toLowerCase().split(' ');
          let selection = null, target = null;
          if(arg[1] && parseInt(arg[1],16) != 'NaN') {
            selection = parseInt(arg[1], 16);
            if( selection < 0 || selection >= message.guild.musicData.playlist.songs.length ) {
              errMsg = ['Invalid selector: ' + arg[1], `Please specify which song via the code to the left.`];
            } else {
              if( arg[2] && parseInt(arg[2],16) != 'NaN') {
                target = parseInt(arg[2],16);
                if( target < 0 || target >= message.guild.musicData.playlist.songs.length ) {
                  errMsg = ['Invalid selector: ' + arg[2], `Please specify which song via the code to the left.`];
                }
              } else target = selection;
            }
          } else {
            errMsg = ['No selector', 'Please specify which song via the code to the left.'];
          }
          if(!errMsg){
            if('copy'.startsWith(arg[0]) && arg[0].length >= 2 || arg[0] === 'cpy') {
              action = 'Copy';
              message.guild.musicData.playlist.songs.splice( target, 0,
                message.guild.musicData.playlist.songs[selection] );
              songsListUpdate(page);
            } else if ('delete'.startsWith(arg[0]) || 'remove'.startsWith(arg[0]) || arg[0] === 'rm' ) {
              action = 'Delete';
              message.guild.musicData.playlist.songs.splice( selection, 1 );
              songsListUpdate(page);
            } else if ('move'.startsWith(arg[0]) || arg[0] === 'mv') {
              action = 'Move';
              let temp = message.guild.musicData.playlist.songs.splice(selection,1)[0];
              message.guild.musicData.playlist.songs.splice(target,0,temp);
              songsListUpdate(page);
            } else if ('swap'.startsWith(arg[0]) ) {
              action = 'Swap';
              if(target != selection) { // No point in swapping in place, and this saves headache caused by the next line.
                if(target > selection) target--;
                let temp = message.guild.musicData.playlist.songs.splice(selection,1)[0];
                temp = message.guild.musicData.playlist.songs.splice(target,1,temp)[0];
                message.guild.musicData.playlist.songs.splice(selection,0,temp);
                songsListUpdate(page);
              }
            }
          }
          if(errMsg) { // Intentionally NOT an else/elif
            errMsg = await message.say({ embed: {
              color: 0xaa2222,
              title: 'Error',
              fields: [
                {
                  name: errMsg[0],
                  value: errMsg[1],
                  inline: false
                }
              ],
              footer: { text:arg.join(' ') }
            }});
          }
          msg.delete();
          controlsEmbed.fields[1].value = action;
          controls.edit({ embed: controlsEmbed });
        });
        msgCollector.on('end', ()=>{
        });
      }
      if('description'.startsWith(arg1)) {
        var descPrompt = await message.say(`The current description for *${message.guild.musicData.playlist.name}* is:
          \`\`\`${message.guild.musicData.playlist.description}\`\`\`
          Enter your new description.`);
        message.channel.awaitMessages( msg=>msg.author === message.author, { max: 1, time: 3600000, errors: ['time']} )
          .then( (response)=>{
            message.guild.musicData.playlist.description = response.first().content;
            message.guild.musicData.playlistModified = true;
            response.first().delete();
            descPrompt.delete();
            return message.say(`Description updated! Use \`${prefix}playlist save\` when you're finished editing.`);
          }).catch( ()=> {
            if(descPrompt && !descPrompt.deleted) descPrompt.delete();
          });
      }
    } else if( arg0 === 'save' || arg0 == 's' ) { // --------------------- Save
      if( !message.guild.musicData.playlist || message.guild.musicData.playlist == "undefined" )
        return message.say( "No playlist currently selected." );

      const name = PlaylistCommand.sanitizeFilename(message.guild.musicData.playlist.name);
      const file = `${dir}/${name}.json`;
      const dataOut = JSON.stringify(message.guild.musicData.playlist,null,4);
      fs.writeFile(file,dataOut,(err2)=>{
        if(err2) throw err2;
        message.guild.musicData.playlistModified = false;
        if(arg1 != 'silent') //Otherwise she'll interrupt herself on the auto-saves.
          message.say('Done');
      });

    } else if( arg0 === 'delete' ){
      if( arg1 === null || arg1 === '' ) return message.say(`Command usage is \`${prefix}playlist delete <playlist_name>\``);
      const name = PlaylistCommand.sanitizeFilename(arg1);
      const file = `${dir}/${name}.json`;

      if(!fs.existsSync(file)) return message.say('Playlist not found.');

        const areYouSure = await message.say("Are you sure? Say 'delete' to confirm.");
        message.channel.awaitMessages( (m)=>m.content.toLowerCase() === 'delete', { max: 1, time: 30000, errors: ['time'] } )
          .then( (response) => {
            fs.unlink(file,(err)=>{
              if(err) throw err;
              return message.say(`Playlist deleted.`);
            });
            response.first().delete();
            areYouSure.delete();
            return;
          }).catch( ()=> {
            if(areYouSure && !areYouSure.deleted)
              areYouSure.delete();
          });

    }
  }
  static sanitizeFilename(filename){
    return filename.toLowerCase()
    .trim()
    .replace(/[\\~#%&*{}/:<>?|\"-\.\/]/g,'')
    .replace(/ /g,'_');
  }
  static constructPlaylistEntry(video){
    const entry = {
      title: video.title,
      videoID: video.id
    }
    return entry;
  }
  static constructSongObj(video, voiceChannel) {
    let duration = this.formatDuration(video.duration);
    if (duration == '00:00') duration = 'Live Stream';
    return {
      url: `https://www.youtube.com/watch?v=${video.raw.id}`,
      title: video.title,
      rawDuration: video.duration,
      duration,
      thumbnail: video.thumbnails.high.url,
      voiceChannel
    };
  }
  static formatDuration(durationObj) {
    const duration = `${durationObj.hours ? (durationObj.hours + ':') : ''}${
      durationObj.minutes ? durationObj.minutes : '00'
    }:${
      (durationObj.seconds < 10)
        ? ('0' + durationObj.seconds)
        : (durationObj.seconds
        ? durationObj.seconds
        : '00')
    }`;
    return duration;
  }
  static playSong(queue, message) {
    const classThis = this; // use classThis instead of 'this' because of lexical scope below
    queue[0].voiceChannel
      .join()
      .then(function(connection) {
        const dispatcher = connection
          .play(
            ytdl(queue[0].url, {
              quality: 'highestaudio'
            })
          )
          .on('start', async function() {
            message.guild.musicData.songDispatcher = dispatcher;
            dispatcher.setVolume(message.guild.musicData.volume);
            const videoEmbed = new MessageEmbed()
              .setThumbnail(queue[0].thumbnail)
              .setColor('#e9f931')
              .addField('Now Playing:', queue[0].title)
              .addField('Duration:', queue[0].duration);
            if (queue[1]) videoEmbed.addField('Next Song:', queue[1].title);
            if(message.guild.musicData.lastNowPlayingEmbed && message.guild.musicData.lastNowPlayingEmbed != 'undefined') {
              message.guild.musicData.lastNowPlayingEmbed.delete();
            }
            message.guild.musicData.lastNowPlayingEmbed = await message.say(videoEmbed);
            message.guild.musicData.nowPlaying = queue[0];
            return queue.shift();
          })
          .on('finish', async function() {
            if (queue.length >= 1) {
              return classThis.playSong(queue, message);
            } else {
              message.guild.musicData.isPlaying = false;
              message.guild.musicData.nowPlaying = null;
              message.guild.musicData.songDispatcher = null;
              if(message.guild.musicData.lastNowPlayingEmbed && message.guild.musicData.lastNowPlayingEmbed != 'undefined') {
                message.guild.musicData.lastNowPlayingEmbed.delete();
                message.guild.musicData.lastNowPlayingEmbed = null;
              }
              if (message.guild.me.voice.channel) {
                return message.guild.me.voice.channel.leave();
              }
            }
          })
          .on('error', function(e) {
            message.say('Cannot play song');
            console.error(e);
            message.guild.musicData.queue.length = 0;
            message.guild.musicData.isPlaying = false;
            message.guild.musicData.nowPlaying = null;
            message.guild.musicData.songDispatcher = null;
            return message.guild.me.voice.channel.leave();
          });
      })
      .catch(function(e) {
        console.error(e);
        return message.guild.me.voice.channel.leave();
      });
  }
  };
