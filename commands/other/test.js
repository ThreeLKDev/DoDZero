const { Command } = require('discord.js-commando');
const { MessageCollector } = require('discord.js');

module.exports = class TestCommand extends Command {
  constructor(client){
    super(client, {
      name: 'test',
      group: 'other',
      memberName: 'test',
      ownerOnly: true,
      description: 'Placeholder for current work-in-progess command.'
    });
  }
  async run( message ) {
    msg.reply('AAAAAAAAAA\n<@!307338440926691328>');
  }
};
