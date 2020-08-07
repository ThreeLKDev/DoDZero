require('dotenv').config();
const { CommandoClient } = require('discord.js-commando');
const { Structures, MessageCollector } = require('discord.js');
const SQliteWrapper = require('./sqlitewrapper.js');
const loader = require('./loader.js');
const path = require('path');
const prefix = process.env.PREFIX;
const token = process.env.TOKEN;
const discord_owner_id = process.env.OWNER;
global.appRoot = require('path').resolve(__dirname);
global.appResources = global.appRoot + '/res';

Structures.extend('Guild', function(Guild) {
  class MusicGuild extends Guild {
    constructor(client, data) {
      super(client, data);
      this.musicData = {
        queue: [],
        isPlaying: false,
        nowPlaying: null,
        songDispatcher: null,
        volume: 1,
        playlist: null,
        playlistModified: false,
        editSelection : null,
        lastNowPlayingEmbed: null
      };
      this.triviaData = {
        isTriviaRunning: false,
        wasTriviaEndCalled: false,
        triviaQueue: [],
        triviaScore: new Map()
      };
      this.channelWatch = {
        text: [],
        voice: [],
        pixiv: []
      };
    }
  }
  return MusicGuild;
});

const client = new CommandoClient({
  commandPrefix: prefix,
  owner: discord_owner_id
});

client.registry
  .registerDefaultTypes()
  .registerGroups([
    ['music', 'Music Command Group'],
    ['gifs', 'Gif Command Group'],
    ['other', 'random types of commands group'],
    ['guild', 'guild related commands'],
    ['xiv', 'FFXIV related commands']
  ])
  .registerDefaultGroups()
  .registerDefaultCommands({
    eval: true,
    prefix: false,
    commandState: true
  })
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.dispatcher.addInhibitor( msg => {
	let inhibit = false;
	if(msg.guild === null) return;
	const numChannels = msg.guild.channelWatch.text.length;
	if(numChannels > 0 ) {
		inhibit = true;
		for( let i = 0; i < numChannels; i++ ) {
			if( msg.channel.id == msg.guild.channelWatch.text[i] ) {
				inhibit = false;
				break;
			}
		}
		if( inhibit ) {
			 return '(Not in recognized command channel)';
		}
	} else {
		if( msg.author.id != discord_owner_id ) {
			return '(Not in recognized command channel)';
		}
	}
//	if( inhibit ) return '(Not in recognized command channel)';
});

client.once('ready', () => {
  console.log('Ready!');
  client.user.setActivity(`for ${prefix}help`, {
    type: 'WATCHING',
    url: 'https://github.com/ThreeLKDev/DoDZero'
  });
  loader.loadAllSync(client);
  client.local = {};
  client.sqlite = new SQliteWrapper();
  client.guilds.cache.forEach( guild => {
    console.log('Foreach guild: ' + guild );
    console.log('Guild has ' + guild.channelWatch.pixiv.length + ' pixiv channel(s)');
    for(let i = 0; i < guild.channelWatch.pixiv.length; i++ ) {
      console.log('Pixiv channel #' + i + ' : ');
      const channel = guild.channels.cache.get( guild.channelWatch.pixiv[i] );
      if(channel) {
        console.log('Succeeded');
        const collector = channel.createMessageCollector( m => !m.author.bot );
        collector.on('collect', (msg) => {
          let isPixivUrl = msg.content.match(/(https:\/\/www\.pixiv\.net(?:\/en)?\/artworks\/[0-9]+)(?:\s(\[?(?:\d+(?:\,\s*|\s)?)*\]?))?/);
          if(isPixivUrl)
            client.registry.commands.get('pixiv').run(msg, {pixivUrl: isPixivUrl[1], which: isPixivUrl[2] });
        });
      } else console.log('Failed.');

    }
  });
});

client.on('voiceStateUpdate', async (___, newState) => {
  if (
    newState.member.user.bot &&
    !newState.channelID &&
    newState.guild.musicData.songDispatcher &&
    newState.member.user.id == client.user.id
  ) {
    newState.guild.musicData.queue.length = 0;
    newState.guild.musicData.songDispatcher.end();
  }
});

client.on('guildMemberAdd', member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
  if (!channel) return;
  channel.send(`Welcome ${member}!`);
});

client.login(token);
