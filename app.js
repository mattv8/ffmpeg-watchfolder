// This is a little video/image conversion scripts
// Written by Dan Gahagan and Matt Visnovsky
// Forked from https://github.com/dgahagan/ffmpeg-watchfolder

const path = require('path');
const { promisify } = require('util'); //required by heic-convert
const fs = require('fs'); //required by heic-convert
const chokidar = require('chokidar'); //https://github.com/paulmillr/chokidar
const heicConvert = require('heic-convert'); //https://www.npmjs.com/package/heic-convert
 
var FfmpegCommand = require('fluent-ffmpeg');

var watchPath = '/mnt/input/';
var outputPath = '/mnt/output/';

var watchOptions = {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
		usePolling: true, // set this to true to successfully watch files over a network
		interval: 500, // in ms
        ignoreInitial: false,
        awaitWriteFinish: false,
        ignorePermissionErrors: false
    };

// Initialize watcher.
const watcher = chokidar.watch(watchPath, watchOptions);

watcher
  .on('add', path => ConvertFile(path,outputPath));

function ConvertFile(file, outputPath){
	//Display something on screen
	const log = console.log.bind(console);
	log(`File ${file} has been added`);
	// log(`File has extension ` + path.extname(file));

	if (path.extname(file).toLowerCase() == '.heic') { //If it's an HEIC image

		//Change output filename from .HEIC extension to .png
		const outputFilename = outputPath+path.parse(file).name + '.png';
		
		if (!fs.existsSync(outputFilename)) {//But first check if file has already been transcoded
			//Do the image file conversion
			(async () => {
				const inputBuffer = await promisify(fs.readFile)(file);
				const outputBuffer = await heicConvert({
				buffer: inputBuffer, // the HEIC file buffer
				format: 'PNG'        // output format
			});

			await promisify(fs.writeFile)(outputFilename, outputBuffer);
				log(`Converted ${file} to .png, the output path was: ${outputFilename}`);
			})();
		} else {
			log(`Image file ${outputFilename} exists, so skipping conversion.`);
		}
		
	} else {  //Otherwise it must be a video file
		
		if (!fs.existsSync(outputPath+path.basename(file))) {//But first check if file has already been transcoded
			//Do the video conversion
			log(`Starting transcode of ${file}`);
			var command = new FfmpegCommand(file)
			.videoCodec('libx264')
			.videoBitrate('4000k')
			// .size('1920x1080') //leaving this commented out will output at native resolution
			.audioCodec('libmp3lame')
			.on('error', function(err) {//log errors
				log(`An error occurred: ` + err.message);
			})
			.on('progress', function(progress) {//log process
				log(`Processing ${path.basename(file)}: ` + Math.round(progress.percent * 100) / 100 + `% done`);
			})
			.on('end', function() {//log completion
				log(`Processing finished on ${path.basename(file)}!`);
			})
			.save(outputPath+path.basename(file))//save to output folder
			;
		} else {
			log(`Video file ${outputPath+path.basename(file)} exists, so skipping transcode.`);
		}
	}
  
}