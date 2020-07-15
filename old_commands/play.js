require('dotenv').config();
const { Util, MessageEmbed } = require('discord.js');
const ytdl = require('ytdl-core');
const Youtube = require('simple-youtube-api');
const youtubeAPI = process.env.YOUTUBE;
const youtube = new Youtube(youtubeAPI);

module.exports = {
	name: 'play',
	description: 'Play command.',
	usage: '[command name]',
	args: true,
	cooldown: 5,
	async execute(message, args) {
		const { channel } = message.member.voice;
		if (!channel) return message.channel.send('I\'m sorry but you need to be in a voice channel to play music!');
		const permissions = channel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT')) return message.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		if (!permissions.has('SPEAK')) return message.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');

		const serverQueue = message.client.queue.get(message.guild.id);

		if ( args[0].match(/^(?!.*\?.*\bv=)https:\/\/www\.youtube\.com\/.*\?.*\blist=.*$/) ) {
			const playlist = await youtube.getPlaylist(args[0]).catch(function() { 
				return message.say('Playlist is either private or does not exist.');
			});
			// add a number argument in getVideos to limit the queue size
			const videosObj = await playlist.getVideos().catch(function(){
				return message.say('There was a problem getting one of the videos in the playlist!');
			});
			for (let i = 0; i < videosObj.length; i++ ){
				if (videosObj[i].raw.status.privaceStatus == 'private') {
					continue;
				} else {
					try {
						const video = await videosObj[i].fetch();
						//if (message.guild.musicData.queue.lenght < LIMIT) {
							
							message.guild.musicData.queue.push( constructSongObj(video, channel) );
							
						//} else {
						//	return message.say(
						//	`Cannot play the full playlist,  song limit is ${LIMIT}`
						//	);
						//}
					} catch (err) { console.log(err); }
				}
			}
			if (message.guild.musicData.isPlaying == false) {
				message.guild.musicData.isPlaying = true;
				return playSong(message.guild.musicData.queue, message);
			} else {
				return message.say(`Playlist - :musical_note: ${playlist_title} :musical_note: has been added to the queue` );
			}
		} else if (args[0].match)(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
			//normal youtube url
			const query = args[0]
				.replace(/(>|<)/gi, '')
				.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
			const id = query[2].split(/[^0-9a-z_\-]/i)[0];
			const video = await youtube.getVideoByID(id).catch(function() {
				return message.say( 'There was a problem getting the video.' ); });
			// // uncomment to disable live streams
			// if (video.raw.snippet.liveBroadcastContent === 'live') {
			//   return message.say("I don't support live streams!");
			// }
			// // can be uncommented if you don't want the bot to play videos longer than 1 hour
			// if (video.duration.hours !== 0) {
			//   return message.say('I cannot play videos longer than 1 hour');
			// }
			// // can be uncommented if you want to limit the queue
			// if (message.guild.musicData.queue.length > 10) {
			//   return message.say(
			//     'There are too many songs in the queue already, skip or wait a bit'
			//   );
			// }
			message.guild.musicData.queue.push( constructSongObj(video, channel);
			if( message.guild.musicData.isPlaying == false || typeof message.guild.musicData.isPlaying == 'undefined' ) {
				message.guild.musicData.isPlaying = true;
				return playSong(message.guild.musicData.queue, message);
			} else if (message.guild.musicData.isPlaying == true) {
				return message.say(`${video.title} added to queue.`);
			}
		} else {
			// song/video name
			const videos = await youtube.searchVideos(args[0], 5).catch( async function() {
				await message.say('There was a problem searching the video you requested :(');
			});
			if(videos.length == 0 || !videos ) {
				return message.say( `I had some trouble finding what you were looking for, please try again or be more specific.` );
			}
			const vidNameArr[];
			for (let i = 0; i < videos.length; i++) {
				vidNameArr.push(`${i+1}: ${videos[i].title}`);
			}
			//vidNameArr.push('exit');
			const embed = new MessageEmbed()
				.setColor('#e9f931')
				.setTitle('Choose a song by commenting a number between 1 and 5')
				.addField('Song 1', vidNameArr[0])
				.addField('Song 2', vidNameArr[1] ? vidNameArr[1] : '---')
				.addField('Song 3', vidNameArr[2] ? vidNameArr[2] : '---')
				.addField('Song 4', vidNameArr[3] ? vidNameArr[3] : '---')
				.addField('Song 5', vidNameArr[4] ? vidNameArr[4] : '---')
				.addField('Exit','exit');
			var songEmbed = await message.channel.send({ embed });
			message.channel.awaitMessages( function(msg) {
				return (msg.content > 0 && msg.content < 6 ) || msg.content == 'exit';
				}, { max: 1, time: 60000, errors: ['time'] }
			).then(function(response) {
				const videoIndex = parseInt(respone.first().content);
				if(response.first().content === 'exit' || !(vidNameArr[videoIndex])) return songEmbed.delete();
				youtube.getVideoByID(videos[videoIndex - 1].id)
					.then(function(video) {
						// // can be uncommented if you don't want the bot to play live streams
						// if (video.raw.snippet.liveBroadcastContent === 'live') {
						//   songEmbed.delete();
						//   return message.say("I don't support live streams!");
						// }
						// // can be uncommented if you don't want the bot to play videos longer than 1 hour
						// if (video.duration.hours !== 0) {
						//   songEmbed.delete();
						//   return message.say('I cannot play videos longer than 1 hour');
						// }
						// // can be uncommented if you don't want to limit the queue
						// if (message.guild.musicData.queue.length > 10) {
						//   songEmbed.delete();
						//   return message.say(
						//     'There are too many songs in the queue already, skip or wait a bit'
						//   );
						// }
						message.guild.musicData.queue.push( constructSongObj(video, channel) );
						if (message.guild.musicData.isPlaying == false ) {
							message.guild.musicData.isPlaying = true;
							if(songEmbed) {
								songEmbed.delete();
							}
							playSong(message.guild.musicData.queue, message);
						} else if (message.guild.musicData.isPlaying == true) {
							if( songEmbed ) {
								songEmbed.delete();
							}
							return message.say(`${video.titile} added to queue`);
							}
						}).catch(function() {
							if(songEmbed) {
								songEmbed.delete();
							}
							return message.say(`An error has occured when trying to get the video ID from youtube.` );
						});
					});
		}

		const songInfo = await ytdl.getInfo(args[0].replace(/<(.+)>/g, '$1'));
		const song = {
			id: songInfo.video_id,
			title: Util.escapeMarkdown(songInfo.title),
			url: songInfo.video_url
		};

		if (serverQueue) {
			serverQueue.songs.push(song);
			console.log(serverQueue.songs);
			return message.channel.send(`âœ… **${song.title}** has been added to the queue!`);
		}

		const queueConstruct = {
			textChannel: message.channel,
			voiceChannel: channel,
			connection: null,
			songs: [],
			volume: 2,
			playing: true
		};
		message.client.queue.set(message.guild.id, queueConstruct);
		queueConstruct.songs.push(song);

		const play = async song => {
			const queue = message.client.queue.get(message.guild.id);
			if (!song) {
				queue.voiceChannel.leave();
				message.client.queue.delete(message.guild.id);
				return;
			}

			const dispatcher = queue.connection.play(ytdl(song.url))
				.on('finish', () => {
					queue.songs.shift();
					play(queue.songs[0]);
				})
				.on('error', error => console.error(error));
			dispatcher.setVolumeLogarithmic(queue.volume / 5);
			queue.textChannel.send(`í¾¶ Start playing: **${song.title}**`);
		};

		try {
			const connection = await channel.join();
			queueConstruct.connection = connection;
			play(queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			message.client.queue.delete(message.guild.id);
			await channel.leave();
			return message.channel.send(`I could not join the voice channel: ${error}`);
		}
	}
};

static constructSongObj(video, voiceChannel) {
	let duration = formatDuration(video.duration);
	if (duration == '00:00' ) duration = 'Live Stream';
	return {
		url: `https://www.youtube.com/watch?v=${video.raw.id}`,
		title: video.title,
		rawDuration: video.duration,
		duration,
		thumbnail: video.thumbnail.high.url,
		voiceChannel
	};
}

static formatDuration(durationObj) {
	const duration = `${durationObj.hours ? (durationObj.hours + ':') : ''}${
		durationObj.minutes ? durationObj.minutes : '00' }:${
		(durationObj.seconds < 10) ? ('0' + durationObj.seconds)
		: (durationObj.seconds ? durationObj.seconds : '00') }`;
	return duration;
}
