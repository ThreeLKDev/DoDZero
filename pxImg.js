'use strict';
const got = require('got');
const path = require('path');
const { Image, createCanvas } = require('canvas');
const { MessageAttachment } = require('discord.js');

module.exports = async function (message, imgUrl) {
	// return new Promise((resolve, reject) => {
		if (typeof imgUrl !== 'string') {
			// reject(new TypeError('Expected a string'));
      throw new TypeError('imgUrl must be a string!');
		}

		const options = {
			// encoding: null,
			headers: {
				Referer: 'http://www.pixiv.net/'
			},
      responseType: 'buffer'
		};

		const response = await got(imgUrl, options);
		const img = new Image();
    img.src = response.body;
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
     ctx.drawImage(img,0,0,canvas.width,canvas.height);
    console.log(path.basename(imgUrl));
    let buffer = canvas.toBuffer('image/jpg');
    console.log(buffer);
    const att = new MessageAttachment(buffer,'aaa.jpg');
    console.log(att);
    message.say(att);
	// });
};
