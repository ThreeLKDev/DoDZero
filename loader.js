const fs = require('fs');
async function load(guild) {
  console.log(`Loading data for guild ${guild.id}`);
  const dir = `./guilds/${guild.id}`;
  const file = `${dir}/guild.json`;
  fs.readFile(file,'utf-8',(err,data)=> {
    if(err){
      if( err.code === 'ENOENT') {
        fs.mkdir(dir+'/playlists', { recursive: true }, (err2)=>{ if (err2) throw err2});
        fs.writeFile(file,JSON.stringify(guild.channelWatch,null,4),(err3)=>{
          if(err3) throw err3;
          console.log(`File not found. Dumped cache for ${file}.`);
        });
      } else throw err;
    }
    if(!data || data == "undefined" ) return;
    const channelWatch = JSON.parse(data.toString());
    guild.channelWatch.text = channelWatch.text;
    guild.channelWatch.voice = channelWatch.voice;
    guild.channelWatch.pixiv = channelWatch.pixiv;
    console.log('Loaded text channels: ' + guild.channelWatch.text.toString());
    console.log('Loaded voice channels: ' + guild.channelWatch.voice.toString());
    console.log('Loaded pixiv channels: ' + guild.channelWatch.pixiv.toString());
  });
}

function loadSync(guild) {
  console.log(`Loading data for guild ${guild.id}`);
  const dir = `./guilds/${guild.id}`;
  const file = `${dir}/guild.json`;
  try {
    let data = fs.readFileSync(file,'utf-8');
    const channelWatch = JSON.parse(data.toString());
    guild.channelWatch.text = channelWatch.text;
    guild.channelWatch.voice = channelWatch.voice;
    guild.channelWatch.pixiv = channelWatch.pixiv;
    console.log('Loaded text channels: ' + guild.channelWatch.text.toString());
    console.log('Loaded voice channels: ' + guild.channelWatch.voice.toString());
    console.log('Loaded pixiv channels: ' + guild.channelWatch.pixiv.toString());
  } catch (err) {
    if( err.code === 'ENOENT') {
      fs.mkdir(dir+'/playlists', { recursive: true }, (err2)=>{ if (err2) throw err2});
      fs.writeFile(file,JSON.stringify(guild.channelWatch,null,4),(err3)=>{
        if(err3) throw err3;
        console.log(`File not found. Dumped cache for ${file}.`);
      });
    } else throw err;
  }
}

async function loadAll(client) {
  console.log('Loading all guilds...');
  client.guilds.cache.forEach(guild => {
    console.log('-------> [' + guild.id + ']');
    load(guild);
  });
}

function loadAllSync(client) {
  console.log('Loading all guilds...');
  client.guilds.cache.forEach(guild => {
    console.log('-------> [' + guild.id + ']');
    loadSync(guild);
  });
}

module.exports.load = load;
module.exports.loadAll = loadAll;
module.exports.loadSync = loadSync;
module.exports.loadAllSync = loadAllSync;
