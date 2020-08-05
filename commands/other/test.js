const { Command } = require('discord.js-commando');
const got = require('got');
const path = require('path');
const { Image, createCanvas } = require('canvas');
const { MessageAttachment } = require('discord.js');

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
    let set = [
      { name: 'John', num: 4, color: 'red' },
      { name: 'Jane', num: 3, color: 'blue'},
      { name: 'Mary', num: 6, color: 'green'},
      { name: 'Stu', num: 7, color: 'black'},
      { name: 'Alice', num: 0, color: 'purple'}
    ];
    const tasks = set.map(TestCommand.testy);
    const results = await Promise.all(tasks);
  }
  static testy( args ) {
    return ( new Promise( () => console.log( [ args.name, args.num, args.color ] ) ) );
  }
};
