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
    let member = message.author;
    let channel = message.channel;

    /*
    Welcome message
    `Welcome to no-garDen of Dragons, ${member.user.username}`
    `Go read through #rules-and-info, then `

    */



  }
};
