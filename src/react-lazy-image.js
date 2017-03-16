import React, { Component, PropTypes } from 'react';
import {TweenMax} from 'gsap';

import './LazyImage.css';

class LazyImage extends Component {

    static propTypes = {
        src: PropTypes.string.isRequired,
		srcMobile: PropTypes.string,
        onError: PropTypes.func,
        onLoaded: PropTypes.func
    }

    static defaultProps = {
        isMobile: false,
        type: null,
        directLoad: true,
        width: 16,
        height : 9
    }

	constructor(props) {
		super(props);

        this.state = {
			isLoaded: false,
            isLoading: false
        };

	}

	componentDidMount(){

        console.log('this.props', this.props);

        this.el = this.refs.el;

        this.lazyElement = null;
        this.top = 0;
        this.containerWidth = this.refs.el.offsetWidth;
        this.containerHeight = this.refs.el.offsetHeight;

        this.source = null;
        this.blob = null;
        this.image = null;
        this.imageUrl = null;
        this.type = null;
        this.xhr = null;

        /**
         * @name setupListeners
         * @desc associative array describing if we have to setup these listeners
         * @access public
         * @instance
         * @memberof LazyLoad
         * @type {Object}
        */

        /**
		 * @name isMobile
	   * @desc If you want the lazy load to load the source provided in data-src-m
	   * @access public
	   * @instance
	   * @memberof LazyLoad
	   * @type {boolean}
	   */
		// this.isMobile =	this.props.isMobile === undefined || this.props.isMobile === null ? false : this.props.isMobile;

		this.setupListeners	=	{
			resize: this.props.setupListeners !== undefined && this.props.setupListeners.resize !== undefined ? this.props.setupListeners.resize : true,
			scroll: this.props.setupListeners !== undefined && this.props.setupListeners.scroll !== undefined ? this.props.setupListeners.scroll : true,
			update: this.props.setupListeners !== undefined && this.props.setupListeners.update !== undefined ? this.props.setupListeners.update : true
		};

        /**
	    * Are the events binded?
	    * @access public
	    * @memberof LazyLoad
	    * @instance
	    * @type {boolean}
	    */
		this.isBinded = false;


		/**
		 * @name aType
	   * @desc <p>Array of different types allowed with their extensions</p>
	   * <p>Types allowed:</p>
	   * <p><ul>
	   * <li>image (.gif, .png, .jpg, .svg, .webp)</li>
	   * <li>video (.mp4)</li>
	   * <li>iframe</li>
	   * </ul></p>
	   * @access public
	   * @instance
	   * @memberof LazyLoad
	   * @type {Object}
	   */
		this.aType = {
			image: ['gif', 'jpg', 'webp', 'png', 'svg'],
			video: ['mp4'],
			iframe: []
		};

        /**
	   * Contains all the handler references
	   * @access public
	   * @memberof LazyLoad
	   * @instance
	   * @type {Object}
	   */
		this.handlers = {
            onImageLoaded: (e) => this.onImageLoaded(e),
			onImageError: (e) => this.errorImageLoad(e),
			onScroll: () => this.onScroll(),
			onResize: () => this.onResize(),
			onUpdate: () => this.onUpdate()
		};

        // just a test to force load
        this.init();
        // this.load(true);

	}

    componentWillUnmount(){

        this.dispose();

    }

    init() {

        this.scrollY = window.scrollY || document.documentElement.scrollTop;

		// fix IE
		if (!window.location.origin) {
			window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
		}

        this.lazyElement = this.createElement(this.refs.el);

        if (this.lazyElement.error) {
            console.info('Lazyload error', this.lazyElement.errorMessage, this.refs.el);
        }

		this.bindEvents();

		// first pass
		this.load();

    }

    bindEvents() {

		if (this.isBinded) return this;

		if (this.debug) console.info('bindEvents', this);

		this.isBinded = true;

		if (this.setupListeners.scroll) window.addEventListener('scroll', this.handlers.onScroll);
		if (this.setupListeners.resize) window.addEventListener('resize', this.handlers.onResize);
		// if (this.setupListeners.update) this.raf = window.requestAnimationFrame(this.handlers.onUpdate);

		return this;
	}


    unbindEvents() {

		if (!this.isBinded) return this;

		this.isBinded = false;

		if (this.debug) console.info('unbindEvents', this);

		if (this.setupListeners.scroll) window.removeEventListener('scroll', this.handlers.onScroll);
		if (this.setupListeners.resize) window.removeEventListener('resize', this.handlers.onResize);
		if (this.setupListeners.update) window.cancelAnimationFrame(this.raf);

		return this;

	}

    reflow(el_){

        if (this.state.isLoaded) return;

		this.scrollY = window.scrollY || document.documentElement.scrollTop;

		this.top = this.refs.el.getBoundingClientRect().top + this.scrollY;

		// allow a new pass
		this.ticketScroll = true;

	}

    reset(el_){

		if (this.xhr !== undefined && this.xhr !== null) {
			this.xhr.abort();
			this.xhr = null;
		}

        this.setState({isLoaded: false});
        this.setState({isLoading: false});

		if (this.image !== undefined && this.image.parentNode !== null)
			this.image.parentNode.removeChild(this.image);

        // reset all loaded ( useless here no we are a level deeper)
		// if (el === null)
		// 	this.allLoaded = false;

		// restart
		this.bindEvents();

		// allow a new pass
		this.ticketScroll = true;

	};

    load(force_ = false) {

		// var force = force_ !== undefined ? force_ : false;

        // let element = this.lazyElement;

        console.log('force_', force_);

        var isVisible = force_ ? true : this.isVisible();

        if (this.debug) console.info('LazyLoad.prototype.load: load ?', this, 'isVisible', isVisible, 'loaded', this.state.isLoaded, 'loading?', this.state.isLoading);

        if (!isVisible || this.state.isLoaded || this.state.isLoading) return false;

        if (this.debug) console.info('LazyLoad.prototype.load: loading!', this);

        this.loadImage();

	}

    onResize (viewport_) {
		this.viewport = viewport_ !== undefined && viewport_.toString() !== '[object Event]' ? viewport_ : {
			height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
			width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
		};

		if (this.debug) console.info('LazyLoad.prototype.onResize', this.viewport, this);

		this.reflow();

	}

    onScroll(scrollY_) {

		// if (scrollY_ !== undefined && typeof (scrollY_) === 'number') this.scrollY =  scrollY_;
		// else {
		// 	this.ticketScroll = true;
		// 	_requestTick.call(this);
		// }

		// if (this.debug) console.info('LazyLoad.prototype.onScroll', this.scrollY, this);

	}

    onUpdate(check_) {
        console.log('onUpdate');

		// once everything is loaded, no need to check
		if (this.allLoaded) return;

		var checkScrollY = check_ !== undefined ? check_ : this.ticketScroll;

		if (this.debug) console.info('LazyLoad.prototype.onUpdate', this);

		if (checkScrollY) this.scrollY = window.scrollY || window.pageYOffset;

		this.load();

		return this;
	}

	isVisible (output_ = false){
        //TODO ALL VIEWPORT / RESIZE / EVENTS stuff
		if (this.props.directLoad) return true;

		var top = this.top;
		var h = this.props.isMobile ? this.heightMobile : this.height;

		if (output_) {
			console.info('is visible ?', (top <= this.viewport.height + this.scrollY && top + h >= this.scrollY));
		}

		return (top <= this.viewport.height + this.scrollY && top + h >= this.scrollY);
	}

    createElement() {

		let error = {
            error: false,
			errorMessage: ''
        }

        this.source = this.props.isMobile ? (this.props.srcMobile ? this.props.srcMobile : this.props.src) : this.props.src;

        this.source =  this.source.substr(0, 4) !== 'http' &&  this.source.substr(0, 2) !== '//' ?
                                        this.source.substr(0, 1) === '/' ?
                                        window.location.origin +  this.source :
                                        window.location.origin + window.location.pathname +  this.source :
                                        this.source;
        this.source = encodeURI(this.source);

		// misc
		// TODO

        // if (el_ instanceof HTMLElement) element.height = el_.getAttribute('data-height') !== null ? parseInt(el_.getAttribute('data-height'), 0) : el_.clientHeight;
		// if (el_ instanceof HTMLElement) element.heightMobile = el_.getAttribute('data-height-m') !== null ? parseInt(el_.getAttribute('data-height-m'), 0) : el_.clientHeight;
		// if (el_ instanceof HTMLElement) element.width = el_.getAttribute('data-width') !== null ? parseInt(el_.getAttribute('data-width'), 0) : el_.clientWidth;
		// if (el_ instanceof HTMLElement) element.widthMobile = el_.getAttribute('data-width-m') !== null ? parseInt(el_.getAttribute('data-width-m'), 0) : el_.clientWidth;
		// if (el_ instanceof HTMLElement) element.top = el_.getBoundingClientRect().top + this.scrollY;
		// if (el_ instanceof HTMLElement) element.useBackground =  el_.getAttribute('data-use-background') !== null ? el_.getAttribute('data-use-background') === 'true' : false;
        console.log('this.props.type', this.props.type);

        this.type = this.props.type !== null ? this.validateType(this.props.type) : this.getType(this.source);

		if (this.type === null) {
			error.error = true;
			error.errorMessage = 'no type recognized';
			// element.isLoaded = true;
            this.setState({isLoaded: true});
		}

		return error;

	}

    getType(src_) {

		var extension = src_.split('.').pop();
		extension = extension.split('?')[0].toLowerCase();

		for (var type in this.aType) {

			var extensions = this.aType[type];

			for (var i = extensions.length - 1; i >= 0; i--) {
				if (extensions[i] === extension)
					return type;
			}

		}

		return null;

	}

    validateType(type_) {

		for (var type in this.aType) {
			if (type === type_.toLowerCase()) return type;
		}

		return null;
	}


    loadImage() {

        console.log('loadImage');

		this.xhr = null;
		// element_.isLoading = true;
        this.setState({isLoading: true});

		// create image
		var img = new Image();
		var src = this.source;
		this.image = img;

        console.log('this.image', this.image);

		var isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
		// var isSafari = true;

		// Trigger the loading with a XHR request
		if ( !isSafari && window.URL && window.Blob && window.XMLHttpRequest) {

			var xhr = new XMLHttpRequest();
			xhr.open( 'GET', src, true );
			xhr.responseType = 'arraybuffer';

			this.xhr = xhr;

			xhr.onerror = ((e) => {

				this.xhr.abort();
				this.xhr = null;

				// load old fashion way
				if (img.complete && img.height) {
					this.onImageLoaded(img);
				} else {
					img.addEventListener('load', this.handlers.onImageLoaded);
					img.addEventListener('onerror', this.handlers.onImageError);
					img.src = src;
				}

			});

			xhr.onload = ((e) => {

				if (xhr.readyState === 4) {

					if ( xhr.status === 200) {

						var extension = src.split('.').pop();
						extension = extension.split('?')[0].toLowerCase();

				    // Obtain a blob: URL for the image data.
                    var arrayBufferView = new window.Uint8Array(xhr.response);
                    var blob = new Blob( [ arrayBufferView ], {type: 'image/' + extension} );
                    this.imageUrl = URL.createObjectURL(blob);

				    // load from the cache as the blob is here already
                    img.addEventListener('load', this.handlers.onImageLoaded);
                    img.addEventListener('onerror', this.handlers.onImageError);
                    img.src = this.imageUrl;

					} else {

						this.xhr.abort();
						this.xhr = null;

						 // something went wrong..
						img.addEventListener('load', this.handlers.onImageLoaded);
						img.addEventListener('onerror', this.handlers.onImageError);
						img.src = src;

					}

				}

			});

			xhr.send();

		} else {

			// load old fashion way
			if (this.image.complete) {
				this.onImageLoaded(this.image);
			} else {
				this.image.addEventListener('load', this.handlers.onImageLoaded);
				this.image.addEventListener('onerror', this.handlers.onImageError);
				this.image.src = src;
                this.imageUrl = src;
			}

		}

	};

    errorImageLoad(e) {

		var img_ = e instanceof HTMLElement ? e : e.target || e.path[0];

		// // retrieve element
		// var element_ = null;
		// for (var i in this.aElements) {
		// 	if (this.aElements[i].el === img_) {
		// 		element_ = this.aElements[i];
		// 		break;
		// 	}
		// }

		// if (element_ === null) return;

		// remove listener otherwise it keeps triggering if no cache
		img_.removeEventListener('load', this.handlers.onImageLoaded);
		img_.removeEventListener('onerror', this.handlers.onImageError);

        this.setState({isLoaded: true});
        this.setState({isLoading: false});

		if (this.xhr !== null) this.xhr = null;

        this.props.onError();
		// var event = new CustomEvent(LazyLoad.EVENT.ELEMENT_ERROR, {detail: element_});
		// this.el.dispatchEvent(event);

		// this.checkIfAllLoaded();

	};

	onImageLoaded(e) {

        console.log('------------- onImageLoaded');
        console.log('this.image', this.image);
        console.log('this.image', this.image.src);

		// var img_ = e instanceof HTMLElement ? e : e.target || e.path[0];
        // let element_ = this.lazyElement;

		// // retrieve element
		// var element_ = null;
		// for (var i in this.aElements) {
		// 	if (this.aElements[i].el === img_) {
		// 		element_ = this.aElements[i];
		// 		break;
		// 	}
		// }

		// if (element_ === null) return;


		// remove listener otherwise it keeps triggering if no cache
		this.image.removeEventListener('load', this.handlers.onImageLoaded);

        this.setState({isLoaded: true});
        this.setState({isLoading: false});

		var src = this.source;

        // TODO
		// if (!element_.useBackground) {
		// 	// Pinterest!
		// 	var pinSrc = src.substr(0, 4) !== 'http' ?  window.location.protocol + src : src;

		// 	this.image.setAttribute('data-pin-media', pinSrc);
		// 	this.image.setAttribute('srcset', pinSrc);
		// 	this.image.setAttribute('data-pin-url', window.location.pathname);
		// }

		// // Clean URL
		// if (window.URL && element_.xhr !== null) {
		// 	window.URL.revokeObjectURL(img_.src);
		// }

		// if (element_.xhr !== null)
		// 	element_.xhr = null;

		// if (element_.appendContainer !== null)
			// element_.useBackground ? element_.appendContainer.style.backgroundImage = "url('" + src + "')" : element_.appendContainer.appendChild(element_.el);

        // this.refs.el.appendChild(this.image);

        // callback props
        this.props.onLoaded();
        this.showImage();

        //Done for this one so unbind
        this.unbindEvents();

		//this.showElement(element_);

	};

    // for now since i'm having issue with JSX and class/set using tweenmax for animation
    showImage() {

    }

    componentDidUpdate(prevProps, prevState){

        console.log('prevState', prevState);
        console.log('state', this.state);

        if(prevState.isLoaded === false && this.state.isLoaded === true){

            setTimeout(() => {
                TweenMax.to(this.refs.image, 1 ,{autoAlpha: 1});
            }, 0);
        }

    }

	_requestTick() {
		if (this.debug) console.info('_requestTick', this.ticketScroll, this);

		if (this.ticketScroll && this.setupListeners.update) {
			this.raf = window.requestAnimationFrame(this.handlers.onUpdate);
		}

		this.ticketScroll = false;
	}

    dispose() {

		this.unbindEvents();
        this.reset();

	}

    render() {
        const {width, height} = this.props;
        const {isLoaded, isLoading} = this.state;

        const ratio = (height / width) * 100 + '%';

        const styles = {
            paddingTop : ratio
        }
        const classNameLazy = (isLoaded ? ' loaded' : '') + (isLoading ? ' loading' : '') +  " lazy";

        var wi = width;
        var hi = height;
        var ri = wi/hi;
        var ws = this.containerWidth;
        var hs = this.containerHeight;
        var rs = ws/hs;
        var new_dimensions={};

        (ri > rs) ? (new_dimensions.ratio = hs/hi, new_dimensions.w = Math.ceil(wi * hs/hi, new_dimensions.h = hs)) : ( new_dimensions.ratio = ws/wi, new_dimensions.w = ws, new_dimensions.h = Math.ceil(hi * ws/wi));

        new_dimensions.top = (hs - new_dimensions.h)/2;
        new_dimensions.left = (ws - new_dimensions.w)/2;

        const imageStyles = {
            width: new_dimensions.w,
            height: new_dimensions.h,
            marginTop: (hs - new_dimensions.h)/2,
            marginLeft: (hs - new_dimensions.h)/2
        }

        return (
            <div style={styles} className={classNameLazy} ref="el">
               { this.state.isLoaded && <img ref="image" style={imageStyles} src={this.imageUrl} data-pin-url="/" role="presentation" />}
            </div>
        );

	}
}

export default LazyImage;
