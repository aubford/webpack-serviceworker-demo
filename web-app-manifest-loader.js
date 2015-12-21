var path = require('path');
var loaderUtils = require('loader-utils');
var steed = require('steed');

function resolveImageSrc(loaderContext, image, callback) {
  var dirname = path.dirname(loaderContext.resourcePath);

  // Resolve the image filename relative to the manifest file
  loaderContext.resolve(dirname, image.src, function(err, filename) {
    if (err) {
      return callback(err);
    }

    // Ensure Webpack knows that the image is a dependency of the manifest
    loaderContext.dependency && loaderContext.dependency(filename);

    // Asynchronously pass the image through the loader pipeline
    loaderContext.loadModule(filename, function(err, source, map, module) {
      if (err) {
        return callback(err);
      }

      // Update the image src property to match the generated filename
      // Is it always the first key in the assets object?
      image.src = Object.keys(module.assets)[0];

      callback(null, image);
    });
  });
}

function resolveImages(loaderContext, manifest, key, callback) {
  if (!Array.isArray(manifest[key])) {
    return callback(null);
  }

  steed.each(manifest[key], resolveImageSrc.bind(null, loaderContext), function(err, images) {
    if (err) {
      return callback(err);
    }

    manifest[key] = images;

    callback(null);
  });
}

module.exports = function(source) {
  var manifest = JSON.parse(source);

  var loaderContext = this;
  var callback = loaderContext.async();

  steed.parallel([
    resolveImages.bind(null, loaderContext, manifest, 'splash_screens'),
    resolveImages.bind(null, loaderContext, manifest, 'icons')
  ], function(err) {
    if (err) {
      return callback(err);
    }

    callback(null, JSON.stringify(manifest, null, 2));
  });
};
