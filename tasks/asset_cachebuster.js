/*
 * grunt-asset-cachebuster
 * https://github.com/gillesruppert/grunt-asset-cachebuster
 *
 * Copyright (c) 2013 Gilles Ruppert
 * Licensed under the MIT license.
 */

'use strict';

var interpolate = require('interpolate');

function isCss(filepath) {
  return (/\.css$/).test(filepath);
}

function isHtml(filepath, extension) {
  var htmlTest = new RegExp('\\.' + extension + '$', 'gi');
  return htmlTest.test(filepath);
}

function bust(buster, url, file) {
  return (typeof buster === 'function') ? buster(url, file) : buster;
}

function replace(replacer, file, options) {
  replacer = interpolate(replacer, { url: options.replacer });
  return function _replace(match, url) {
    if (!options.ignore.some(function (ignore) { return match.indexOf(ignore) > -1; })) {
      return interpolate(replacer, { url: url, buster: bust(options.buster, url, file) });
    } else {
      return match;
    }
  };
}

function cacheBustCss(css, dest, options) {
  var img = /url\(['"]?(?!data:)([^)'"?]+)['"]?(?:\?v=[0-9]+)*\)/gi;
  return css.replace(img, replace('url({url})', dest, options));
}

function cacheBustHtml(html, dest, options) {
  var css = /href="(.+\.css)"/gi;
  html = html.replace(css, replace('href="{url}"', dest, options));

  var js = /src="(.+\.js)"/gi;
  html = html.replace(js, replace('src="{url}"', dest, options));

  var images = /src="(.+\.(?:png|gif|jpg|jpeg))"/gi;
  html = html.replace(images, replace('src="{url}"', dest, options));
  return html;
}


module.exports = function(grunt) {

  function cacheBust(src, files, options) {
    if (isCss(files.dest)) {
      grunt.file.write(files.dest, cacheBustCss(src, files.dest, options));
    }
    else if (isHtml(files.dest, options.htmlExtension)) {
      grunt.file.write(files.dest, cacheBustHtml(src, files.dest, options));
    } else {
      grunt.file.write(files.dest, cacheBustHtml(src, files.dest, options));
    }
    grunt.log.writeln('Assets in "' + files.dest + '" cachebusted.');
  }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('asset_cachebuster', 'Cachebust images, scripts and other assets in your HTML & CSS files.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      buster: '123456',
      replacer: '{url}?v={buster}',
      ignore: [],
      htmlExtension: 'html'
    });

    // Iterate over all specified file groups.
    this.files.forEach(function(files) {
      var src = files.src.filter(function(filepath) {
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function (filepath) { return grunt.file.read(filepath); })
      .join(grunt.util.normalizelf(''));

      try {
        cacheBust(src, files, options);
      } catch (e) {
        grunt.log.error('ERROR:', e.message, e);
        grunt.fail.warn('Failed to cachebust assets in: ' + files.dest);
      }
    });

  });
};
