require('dotenv').config();
const { CommandoClient } = require('discord.js-commando');
const { Structures } = require('discord.js');
const loader = require('./loader.js');
const path = require('path');
const prefix = process.env.PREFIX;
const token = process.env.TOKEN;
const discord_owner_id = process.env.OWNER;

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
	voice: []
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
    ['guild', 'guild related commands']
  ])
  .registerDefaultGroups()
  .registerDefaultCommands({
    eval: true,
    prefix: false,
    commandState: false
  })
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.dispatcher.addInhibitor( msg => {
	console.log(` -> ${msg.content}`);
	let inhibit = false;
	if(msg.guild === null) return;
	const numChannels = msg.guild.channelWatch.text.length;
	if(numChannels > 0 ) {
		console.log(` -- -> numChannels > 0`);
		inhibit = true;
		for( let i = 0; i < numChannels; i++ ) {
			if( msg.channel.id == msg.guild.channelWatch.text[i] ) {
			console.log(` -- -> Channel allowed`);
				inhibit = false;
				break;
			}
		}
		if( inhibit ) {
			console.log(` -- -> Channel disallowed!`);
			 return '(Not in recognized command channel)';
		}
	} else {
		console.log(` -- -> numChannels <= 0 ?`);
		if( msg.author.id != discord_owner_id ) {
			console.log(` -- -> Author NOT owner`);
			return '(Not in recognized command channel)';
		} else console.log(` -- -> Author IS owner`);
	}
	console.log(` -- -> End`);
//	if( inhibit ) return '(Not in recognized command channel)';
});

client.once('ready', () => {
  console.log('Ready!');
  client.user.setActivity(`${prefix}help`, {
    type: 'WATCHING',
    url: 'https://github.com/ThreeLKDev/DoDZero'
  });
  loader.loadAll(client);
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
  const channel = member.guild.channels.cache.find(ch => ch.name === 'general'); // change this to the channel name you want to send the greeting to
  if (!channel) return;
  channel.send(`Welcome ${member}!`);
});

client.login(token);
