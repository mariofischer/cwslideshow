
/**
 * Quick slideshow/image loading extension for mootools
 *
 * @author Mario Fischer <mario@chipwreck.de>
 * @version 0.6
 */
var CwSlideshow = new Class({

	Implements: [Events, Options],
	
	counter: 0,
	isRunning: false,
	myTimer: false,
	mySpinner: false,
	
	options: {
		imagePath: false, /* path to the images (optional) */
		setDimensions: false, /* set width and height of the img-tag */
		setAltTag: true, /* set the alt-tag of the image to the caption */ 
		setTitleTag: true, /* set the title-tag of the image to the caption */
	
		target: 'my-image', /* id of the img-tag */
		targetOuter: 'my-gallery', /* id of the outer element */
		targetCaption: 'my-slideshow-captions', /* id of the caption element, false disables captions */
		targetCounter: 'my-counter', /* id of the counter element, false disables counter */
		
		initialImage: 1, /* number of image to show initially, false = show nothing initially */
		initialSlideshow: false, /* start slideshow immediately? */ 
		initialSpinner: false, /* show spinner immediately? */ 
		loop: true, /* cycle slideshow? */
		random: false, /* randomize slideshow? */
		slideshowDelay: 5000, /* slideshow delay in ms */
		
		loadingMessage: 'Bild laden..', /* optional message to show on the spinning wheel */
		counterOutput: '_COUNT_ / _TOTAL_', /* how to output the counter, use _COUNT_ and _TOTAL_ as variables */

		morphDuration: 600, /* duration of the morph in milliseconds */
		morphInnerDelay: 300,
		morphTransition: Fx.Transitions.Sine.easeOut,  /* transition of the morph */
		
		keysEnabled: true,  /* enable keyboard shortcuts */
		
		onBeforeLoad: function() {}, /* Fired before image is (pre)loaded */
		onShown: function() {}, /* Fired when image is loaded and shown */
		onStatusChange: function(elem, status) {}, /* Fired when image is changed or slideshow status */

		onLoaded: function(i) {
			this.assetsLoaded[i] = true;
			this.showImage(i);
		},
		
		onPreloaded: function(i) {
			// console.log("preloading "+i+" done.");
			this.assetsLoaded[i] = true;
		}
    },
    
    initialize: function(images, options)
    {
    	// Init vars
    	this.setOptions(options);
    
		var keyupEvt = function(e) {
			if (this.options.keysEnabled) {
				switch (e.key) {
					case 'left': 
						this.fireEvent('statusChange', ['prev', 'flash']);
						this.prev();
						break;
					case 'right': 
						this.fireEvent('statusChange', ['next', 'flash']);
						this.next();
						break;
					case 'space': 
						this.toggleSlideshow();
						break;
					case 'esc': 
						this.stop();
						break;
				}
			}
		}.bind(this);

    	if (this.options.imagePath) {
    		this.images = images.map((function(item){
    			item.src = this.options.imagePath + item.src;
				return item;
			}).bind(this));
    	}
    	else {
    		this.images = images;
    	}
    	
		if ( (this.options.target.indexOf('_COUNT_') == 0) && (!document.id(this.options.targetOuter) || !document.id(this.options.target) ) ) {
    		console.log("Target elements not found, exiting.");
    		return;
    	}

    	this.max = images.length;
    	this.assetsLoaded = new Array(this.max);
    	this.mySpinner = new Spinner(this.options.targetOuter, { useIframeShim: true, message: this.options.loadingMessage } );
    	
        document.addEvent('keyup', keyupEvt);        
   		if (Browser.ie) {
			document.id(this.options.target).setStyle('msInterpolationMode' ,'bicubic');
		}
		
		// Startup options
		
		if (this.options.initialSpinner) {
			this.mySpinner.show();
		}
		
		if (this.options.initialImage) {
			this.show(this.options.initialImage - 1);
		}
		if (this.options.initialSlideshow) {
			this.start();
		}
    },
    
    preloadAndShowImage: function(i)
    {
    	new Asset.image(this.images[i].src, {
			onload: function(){this.fireEvent('loaded', i);}.bind(this)
		});
    },
    
    preloadImage: function(i)
    {
    	if (!this.assetsLoaded[i]) {
    		// console.log("preloading.. #"+i);
	    	new Asset.image(this.images[i].src, {
				onload: function(){this.fireEvent('preloaded', i);}.bind(this)
			});
		}
    },
    
    preloadAndShowAllImages: function()
    {
    	var self = this;
    	var imagepaths = new Array(this.max);
    	this.images.each(function(item,idx){imagepaths[idx] = item.src;});
    	
    	Asset.images(imagepaths, {
    		onProgress: function(counter, idx) {
	    		document.id(self.getTargetForIndex(idx)).setStyle('background-image', 'none');
     			document.id(self.getTargetForIndex(idx)).set('src', self.images[idx].src);
    		},
    		onComplete: function() {
				self.mySpinner.hide();
    		}
		});

    },
    
    fadeImage: function(i)
	{
		this.fireEvent('beforeLoad');
		if (this.assetsLoaded[i]) {
			this.showImage(i);
		}
		else {
			this.mySpinner.show();
			this.preloadAndShowImage(i);
		}
	},

    showImage: function(i)
	{
		var self = this;
		
	    var morph = new Fx.Morph(this.options.targetOuter, {link: 'chain', duration: this.options.morphDuration, transition: this.options.morphTransition});
		morph.start({'opacity': 0}).chain(		
			function() {

				document.id(self.options.target).set('src', self.images[i].src);
				if (self.options.setTitleTag) {
					document.id(self.options.target).set('title', self.convertEntities(self.images[i].caption));
				}
				if (self.options.setAltTag) {
					document.id(self.options.target).set('alt', self.convertEntities(self.images[i].caption));
				}
				if (self.options.setDimensions && self.images[i].dimensions.w > 0 && self.images[i].dimensions.h > 0) {
					document.id(self.options.target).set('width', self.images[i].dimensions.w);
					document.id(self.options.target).set('height', self.images[i].dimensions.h);
				}
				self.mySpinner.hide();
		
				if (document.id(self.options.targetCaption)) {
					document.id(self.options.targetCaption).set('html', self.images[i].caption);
				}

				if (document.id(self.options.targetCounter)) {
					var counterHtml = self.options.counterOutput.replace(/_COUNT_/, (self.counter+1)).replace(/_TOTAL_/, self.max);
					document.id(self.options.targetCounter).set('html', counterHtml);
				}
				this.callChain();
    		},
    		
    		function() {
    			var fadeIn = function(){
					morph.start({'opacity': 1});
					self.fireEvent('shown');
				};
				
				fadeIn.delay(self.options.morphInnerDelay);
				
				if ( (i+1) < self.max ) {
					self.preloadImage(i+1);
				}
				if ( (i+2) < self.max ) {
					self.preloadImage(i+2);
				}
				if ( (i-1) > 0 ) {
					self.preloadImage(i-1);
				}
    		}
    	);
	},
	
	show: function(which)
	{
		this.counter = which;
		this.validateCounter();
		this.fadeImage(this.counter);
	},
	
	next: function()
	{
		this.counter++;
		if (!this.validateCounter()) { return; }
		this.fadeImage(this.counter);
	},
	
	prev: function()
	{
		this.counter--;
		if (!this.validateCounter()) { return; }
		this.fadeImage(this.counter);
	},
	
	advance: function()
	{
		if (this.options.random) {
			this.counter = this.getRandomIndex();
			this.fadeImage(this.counter);
		}
		else {
			this.next();
		}
	},

	start: function()
	{
		if (!this.isRunning && this.max > 0) {
			this.isRunning = true;
			this.advance();
			this.myTimer = this.advance.periodical(this.options.slideshowDelay, this); 
			this.fireEvent('statusChange', ['slideshow', this.isRunning]);
		}
	},
	
	stop: function()
	{
		if (this.isRunning) {
			this.isRunning = false;
			clearInterval(this.myTimer);
			this.fireEvent('statusChange', ['slideshow', this.isRunning]);
		}
	},
	
	getRandomIndex: function()
	{
		var newCounter;
		var i = 0;
		while (true) {
			newCounter = parseInt(Math.random() * this.max, 10);
			i++;
			if (newCounter !== this.counter || i > 10) {
				break;
			}
		}
		return newCounter;
	},
	
	validateCounter: function()
	{
		if (this.max === 1) { return false; }
		var ret = true;
		if (this.options.loop) {
			if (this.counter >= this.max) {
				this.counter = 0;
			}
			else if (this.counter < 0) {
				this.counter = this.max - 1;
			}
		}
		else {
			var newcounter = this.counter.limit(0, this.max - 1);
			if ( (newcounter === 0 || newcounter === this.max - 1) && newcounter !== this.counter ) {
				ret = false;
			}
			this.counter = newcounter;
		}
		return ret;
	},

	toggleSlideshow: function()
	{
		if (this.isRunning) {
			this.stop();
		}
		else {
			this.start();
		}
		
	},
	
	getTargetForIndex: function(i)
	{
		return this.options.target.replace(/_COUNT_/, i);
	},
	
	setKeysEnabled: function(value)
	{
		this.options.keysEnabled = value;
	},
	
	convertEntities: function(str)
	{
		var temp = document.createElement("pre");
		temp.innerHTML = str;
		return temp.firstChild.nodeValue;
	}	
});
