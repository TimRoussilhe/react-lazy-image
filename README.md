# React Lazy Image

## Introduction

Let you create an image component that will lazy load when reaching position in viewport.

## Installation

import Image from 'react-lazy-image';

<LazyImage src={element.src} onLoaded={this.onLoaded}/>

## API

`load({ force: Boolean }): void`
You can forc lazy loading of an element

`onImageLoaded({ element: Object }): void`
Let you handle callback when image is loaded

`onImageError({ element: Object }): void`
Let you handle callback when image error

`reflow({ element: Object }): void`
Recalculate position of element

## PROPS

`src: PropTypes.string.isRequired`
`srcMobile: PropTypes.string`
`onError: PropTypes.func`
`onLoaded: PropTypes.func`

## Todo

- [ ] Decorator
- [ ] Extracting scroll logic and addind video and Iframe ( almost there )
- [ ] Examples