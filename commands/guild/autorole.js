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
      description: ' '
    });
  }
  async run( message ) {
    if(!message.channel.guild.autoRole.task && false){
      console.log('[autorole] Scheduling task...');
      let task = cron.schedule('0 1 * * *', async () => {
        console.log('[autorole] Task running...');

        let query = await xiv.freecompany.get(message.channel.guild.freeCompany.ID, {
          extended: true, data: 'FCM', columns: ['FreeCompanyMembers.*.Rank','FreeCompanyMembers.*.ID','FreeCompanyMembers.*.Name'].join(',')});

        console.log('[autorole] Task finished.');
      });
      message.channel.guild.autoRole.task = task;
    }
    let query = await xiv.freecompany.get(message.channel.guild.freeCompany.ID, {
      extended: true, data: 'FCM', columns: ['FreeCompanyMembers.*.Rank','FreeCompanyMembers.*.ID','FreeCompanyMembers.*.Name'].join(',')});
      console.log(query);
  }
};
