/*!
loadCSS: load a CSS file asynchronously.
[c]2015 @scottjehl, Filament Group, Inc.
Licensed MIT
*/
!function(e){"use strict";e.loadCSS=function(t,l,n){var r,i=e.document,o=i.createElement("link");if(l)r=l;else{var s;s=i.querySelectorAll?i.querySelectorAll("style,link[rel=stylesheet],script"):(i.body||i.getElementsByTagName("head")[0]).childNodes,r=s[s.length-1]}var a=i.styleSheets;o.rel="stylesheet",o.href=t,o.media="only x",r.parentNode.insertBefore(o,l?r:r.nextSibling);var c=function(e){for(var t=o.href,l=a.length;l--;)if(a[l].href===t)return e();setTimeout(function(){c(e)})};return o.onloadcssdefined=c,c(function(){o.media=n||"all"}),o}}(this);