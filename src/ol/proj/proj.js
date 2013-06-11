goog.provide('ol.Projection');
goog.provide('ol.ProjectionLike');
goog.provide('ol.ProjectionUnits');
goog.provide('ol.proj');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');
goog.require('ol.Extent');
goog.require('ol.TransformFunction');
goog.require('ol.sphere.NORMAL');


/**
 * @define {boolean} Enable Proj4js.
 */
ol.ENABLE_PROJ4JS = true;


/**
 * Have Proj4js.
 * @const {boolean}
 */
ol.HAVE_PROJ4JS = ol.ENABLE_PROJ4JS && typeof Proj4js == 'object';


/**
 * A projection as {@link ol.Projection}, SRS identifier string or undefined.
 * @typedef {ol.Projection|string|undefined} ol.ProjectionLike
 */
ol.ProjectionLike;


/**
 * @enum {string}
 */
ol.ProjectionUnits = {
  DEGREES: 'degrees',
  FEET: 'ft',
  METERS: 'm',
  PIXELS: 'pixels'
};


/**
 * @const {Object.<ol.ProjectionUnits, number>} Meters per unit lookup table.
 */
ol.METERS_PER_UNIT = {};
ol.METERS_PER_UNIT[ol.ProjectionUnits.DEGREES] =
    2 * Math.PI * ol.sphere.NORMAL.radius / 360;
ol.METERS_PER_UNIT[ol.ProjectionUnits.FEET] = 0.3048;
ol.METERS_PER_UNIT[ol.ProjectionUnits.METERS] = 1;
ol.METERS_PER_UNIT[ol.ProjectionUnits.PIXELS] = NaN;



/**
 * @constructor
 * @param {ol.ProjectionOptions} options Projection options.
 */
ol.Projection = function(options) {

  /**
   * @private
   * @type {string}
   */
  this.code_ = options.code;

  /**
   * @private
   * @type {ol.ProjectionUnits}
   */
  this.units_ = options.units;

  /**
   * @private
   * @type {ol.Extent}
   */
  this.extent_ = options.extent;

  /**
   * @private
   * @type {string}
   */
  this.axisOrientation_ = goog.isDef(options.axisOrientation) ?
      options.axisOrientation : 'enu';

  /**
   * @private
   * @type {boolean}
   */
  this.global_ = goog.isDef(options.global) ? options.global : false;

  /**
   * @private
   * @type {ol.tilegrid.TileGrid}
   */
  this.defaultTileGrid_ = null;

};


/**
 * @return {string} Code.
 */
ol.Projection.prototype.getCode = function() {
  return this.code_;
};


/**
 * @return {ol.Extent} Extent.
 */
ol.Projection.prototype.getExtent = function() {
  return this.extent_;
};


/**
 * @param {number} resolution Resolution.
 * @param {ol.Coordinate} point Point.
 * @return {number} Point resolution.
 */
ol.Projection.prototype.getPointResolution = goog.abstractMethod;


/**
 * @return {ol.ProjectionUnits} Units.
 */
ol.Projection.prototype.getUnits = function() {
  return this.units_;
};


/**
 * @return {number} Meters.
 */
ol.Projection.prototype.getMetersPerUnit = function() {
  return ol.METERS_PER_UNIT[this.units_];
};


/**
 * @return {string} Axis orientation.
 */
ol.Projection.prototype.getAxisOrientation = function() {
  return this.axisOrientation_;
};


/**
 * @return {boolean} Wether the projection is global.
 */
ol.Projection.prototype.isGlobal = function() {
  return this.global_;
};


/**
 * @return {ol.tilegrid.TileGrid} The default tile grid.
 */
ol.Projection.prototype.getDefaultTileGrid = function() {
  return this.defaultTileGrid_;
};


/**
 * @param {ol.tilegrid.TileGrid} tileGrid The default tile grid.
 */
ol.Projection.prototype.setDefaultTileGrid = function(tileGrid) {
  this.defaultTileGrid_ = tileGrid;
};



/**
 * @constructor
 * @extends {ol.Projection}
 * @param {Proj4js.Proj} proj4jsProj Proj4js projection.
 * @param {ol.Proj4jsProjectionOptions} options Proj4js projection options.
 * @private
 */
ol.Proj4jsProjection_ = function(proj4jsProj, options) {

  var units = /** @type {ol.ProjectionUnits} */ (proj4jsProj.units);

  var config = /** @type {ol.ProjectionOptions} */ ({
    units: units,
    axisOrientation: proj4jsProj.axis
  });
  goog.object.extend(config, options);

  goog.base(this, config);

  /**
   * @private
   * @type {Proj4js.Proj}
   */
  this.proj4jsProj_ = proj4jsProj;

  /**
   * @private
   * @type {?ol.TransformFunction}
   */
  this.toEPSG4326_ = null;

};
goog.inherits(ol.Proj4jsProjection_, ol.Projection);


/**
 * @inheritDoc
 */
ol.Proj4jsProjection_.prototype.getPointResolution =
    function(resolution, point) {
  if (this.getUnits() == ol.ProjectionUnits.DEGREES) {
    return resolution;
  } else {
    // Estimate point resolution by transforming the center pixel to EPSG:4326,
    // measuring its width and height on the normal sphere, and taking the
    // average of the width and height.
    if (goog.isNull(this.toEPSG4326_)) {
      this.toEPSG4326_ = ol.proj.getTransformFromProjections(
          this, ol.proj.getProj4jsProjectionFromCode_({
            code: 'EPSG:4326',
            extent: null
          }));
    }
    var vertices = [
      point[0] - resolution / 2, point[1],
      point[0] + resolution / 2, point[1],
      point[0], point[1] - resolution / 2,
      point[0], point[1] + resolution / 2
    ];
    vertices = this.toEPSG4326_(vertices, vertices, 2);
    var width = ol.sphere.NORMAL.haversineDistance(
        vertices.slice(0, 2), vertices.slice(2, 4));
    var height = ol.sphere.NORMAL.haversineDistance(
        vertices.slice(4, 6), vertices.slice(6, 8));
    var pointResolution = (width + height) / 2;
    if (this.getUnits() == ol.ProjectionUnits.FEET) {
      // The radius of the normal sphere is defined in meters, so we must
      // convert back to feet.
      pointResolution /= 0.3048;
    }
    return pointResolution;
  }
};


/**
 * @return {Proj4js.Proj} Proj4js projection.
 */
ol.Proj4jsProjection_.prototype.getProj4jsProj = function() {
  return this.proj4jsProj_;
};


/**
 * @private
 * @type {Object.<string, ol.Proj4jsProjection_>}
 */
ol.proj.proj4jsProjections_ = {};


/**
 * @private
 * @type {Object.<string, ol.Projection>}
 */
ol.proj.projections_ = {};


/**
 * @private
 * @type {Object.<string, Object.<string, ol.TransformFunction>>}
 */
ol.proj.transforms_ = {};


/**
 * Registers transformation functions that don't alter coordinates. Those allow
 * to transform between projections with equal meaning.
 *
 * @param {Array.<ol.Projection>} projections Projections.
 */
ol.proj.addEquivalentProjections = function(projections) {
  ol.proj.addProjections(projections);
  goog.array.forEach(projections, function(source) {
    goog.array.forEach(projections, function(destination) {
      if (source !== destination) {
        ol.proj.addTransform(source, destination, ol.proj.cloneTransform);
      }
    });
  });
};


/**
 * Registers transformation functions to convert coordinates in any projection
 * in projection1 to any projection in projection2.
 *
 * @param {Array.<ol.Projection>} projections1 Projections with equal meaning.
 * @param {Array.<ol.Projection>} projections2 Projections with equal meaning.
 * @param {ol.TransformFunction} forwardTransform Transformation from any
 *   projection in projection1 to any projection in projection2.
 * @param {ol.TransformFunction} inverseTransform Transform from any projection
 *   in projection2 to any projection in projection1..
 */
ol.proj.addEquivalentTransforms =
    function(projections1, projections2, forwardTransform, inverseTransform) {
  goog.array.forEach(projections1, function(projection1) {
    goog.array.forEach(projections2, function(projection2) {
      ol.proj.addTransform(projection1, projection2, forwardTransform);
      ol.proj.addTransform(projection2, projection1, inverseTransform);
    });
  });
};


/**
 * @param {ol.Proj4jsProjection_} proj4jsProjection Proj4js projection.
 * @private
 */
ol.proj.addProj4jsProjection_ = function(proj4jsProjection) {
  var proj4jsProjections = ol.proj.proj4jsProjections_;
  var code = proj4jsProjection.getCode();
  goog.asserts.assert(!goog.object.containsKey(proj4jsProjections, code));
  proj4jsProjections[code] = proj4jsProjection;
};


/**
 * @param {ol.Projection} projection Projection.
 */
ol.proj.addProjection = function(projection) {
  var projections = ol.proj.projections_;
  var code = projection.getCode();
  projections[code] = projection;
  ol.proj.addTransform(projection, projection, ol.proj.cloneTransform);
};


/**
 * @param {Array.<ol.Projection>} projections Projections.
 */
ol.proj.addProjections = function(projections) {
  goog.array.forEach(projections, function(projection) {
    ol.proj.addProjection(projection);
  });
};


/**
 * FIXME empty description for jsdoc
 */
ol.proj.clearAllProjections = function() {
  if (ol.ENABLE_PROJ4JS) {
    ol.proj.proj4jsProjections_ = {};
  }
  ol.proj.projections_ = {};
  ol.proj.transforms_ = {};
};


/**
 * @param {ol.Projection|string|undefined} projection Projection.
 * @param {string} defaultCode Default code.
 * @return {ol.Projection} Projection.
 */
ol.proj.createProjection = function(projection, defaultCode) {
  if (!goog.isDefAndNotNull(projection)) {
    return ol.proj.get(defaultCode);
  } else if (goog.isString(projection)) {
    return ol.proj.get(projection);
  } else {
    goog.asserts.assertInstanceof(projection, ol.Projection);
    return projection;
  }
};


/**
 * Registers a conversion function to convert coordinates from the source
 * projection to the destination projection.
 *
 * @param {ol.Projection} source Source.
 * @param {ol.Projection} destination Destination.
 * @param {ol.TransformFunction} transformFn Transform.
 */
ol.proj.addTransform = function(source, destination, transformFn) {
  var sourceCode = source.getCode();
  var destinationCode = destination.getCode();
  var transforms = ol.proj.transforms_;
  if (!goog.object.containsKey(transforms, sourceCode)) {
    transforms[sourceCode] = {};
  }
  transforms[sourceCode][destinationCode] = transformFn;
};


/**
 * Unregisters the conversion function to convert coordinates from the source
 * projection to the destination projection.  This method is used to clean up
 * cached transforms during testing.
 *
 * @param {ol.Projection} source Source projection.
 * @param {ol.Projection} destination Destination projection.
 * @return {ol.TransformFunction} transformFn The unregistered transform.
 */
ol.proj.removeTransform = function(source, destination) {
  var sourceCode = source.getCode();
  var destinationCode = destination.getCode();
  var transforms = ol.proj.transforms_;
  goog.asserts.assert(sourceCode in transforms);
  goog.asserts.assert(destinationCode in transforms[sourceCode]);
  var transform = transforms[sourceCode][destinationCode];
  delete transforms[sourceCode][destinationCode];
  var keys = goog.object.getKeys(transforms[sourceCode]);
  if (keys.length === 0) {
    delete transforms[sourceCode];
  }
  return transform;
};


/**
 * @param {ol.ProjectionLike} projectionLike Either a code string which is a
 *     combination of authority and identifier such as "EPSG:4326", or an
 *     existing projection object, or undefined.
 * @return {ol.Projection} Projection.
 */
ol.proj.get = function(projectionLike) {
  var projection;
  if (projectionLike instanceof ol.Projection) {
    projection = projectionLike;
  } else if (goog.isString(projectionLike)) {
    var code = projectionLike;
    projection = ol.proj.projections_[code];
    if (ol.HAVE_PROJ4JS && !goog.isDef(projection)) {
      projection = ol.proj.getProj4jsProjectionFromCode_({
        code: code,
        extent: null
      });
    }
    if (!goog.isDef(projection)) {
      goog.asserts.assert(goog.isDef(projection));
      projection = null;
    }
  } else {
    projection = null;
  }
  return projection;
};


/**
 * @param {ol.Proj4jsProjectionOptions} options Proj4js projection options.
 * @private
 * @return {ol.Proj4jsProjection_} Proj4js projection.
 */
ol.proj.getProj4jsProjectionFromCode_ = function(options) {
  var code = options.code;
  var proj4jsProjections = ol.proj.proj4jsProjections_;
  var proj4jsProjection = proj4jsProjections[code];
  if (!goog.isDef(proj4jsProjection)) {
    var proj4jsProj = new Proj4js.Proj(code);
    var srsCode = proj4jsProj.srsCode;
    proj4jsProjection = proj4jsProjections[srsCode];
    if (!goog.isDef(proj4jsProjection)) {
      var config = /** @type {ol.Proj4jsProjectionOptions} */
          (goog.object.clone(options));
      config.code = srsCode;
      proj4jsProjection = new ol.Proj4jsProjection_(proj4jsProj, config);
      proj4jsProjections[srsCode] = proj4jsProjection;
    }
    proj4jsProjections[code] = proj4jsProjection;
  }
  return proj4jsProjection;
};


/**
 * Checks if two projections are the same, that is every coordinate in one
 * projection does represent the same geographic point as the same coordinate in
 * the other projection.
 *
 * @param {ol.Projection} projection1 Projection 1.
 * @param {ol.Projection} projection2 Projection 2.
 * @return {boolean} Equivalent.
 */
ol.proj.equivalent = function(projection1, projection2) {
  if (projection1 === projection2) {
    return true;
  } else if (projection1.getUnits() != projection2.getUnits()) {
    return false;
  } else {
    var transformFn = ol.proj.getTransformFromProjections(
        projection1, projection2);
    return transformFn === ol.proj.cloneTransform;
  }
};


/**
 * Given the projection-like objects this method searches for a transformation
 * function to convert a coordinates array from the source projection to the
 * destination projection.
 *
 * @param {ol.ProjectionLike} source Source.
 * @param {ol.ProjectionLike} destination Destination.
 * @return {ol.TransformFunction} Transform.
 */
ol.proj.getTransform = function(source, destination) {
  var sourceProjection = ol.proj.get(source);
  var destinationProjection = ol.proj.get(destination);
  return ol.proj.getTransformFromProjections(
      sourceProjection, destinationProjection);
};


/**
 * Searches a function that can be used to convert coordinates from the source
 * projection to the destination projection.
 *
 * @param {ol.Projection} sourceProjection Source projection.
 * @param {ol.Projection} destinationProjection Destination projection.
 * @return {ol.TransformFunction} Transform.
 */
ol.proj.getTransformFromProjections =
    function(sourceProjection, destinationProjection) {
  var transforms = ol.proj.transforms_;
  var sourceCode = sourceProjection.getCode();
  var destinationCode = destinationProjection.getCode();
  var transform;
  if (goog.object.containsKey(transforms, sourceCode) &&
      goog.object.containsKey(transforms[sourceCode], destinationCode)) {
    transform = transforms[sourceCode][destinationCode];
  }
  if (ol.HAVE_PROJ4JS && !goog.isDef(transform)) {
    var proj4jsSource;
    if (sourceProjection instanceof ol.Proj4jsProjection_) {
      proj4jsSource = sourceProjection;
    } else {
      proj4jsSource =
          ol.proj.getProj4jsProjectionFromCode_({
            code: sourceCode,
            extent: null
          });
    }
    var sourceProj4jsProj = proj4jsSource.getProj4jsProj();
    var proj4jsDestination;
    if (destinationProjection instanceof ol.Proj4jsProjection_) {
      proj4jsDestination = destinationProjection;
    } else {
      proj4jsDestination =
          ol.proj.getProj4jsProjectionFromCode_({
            code: destinationCode,
            extent: null
          });
    }
    var destinationProj4jsProj = proj4jsDestination.getProj4jsProj();
    transform =
        /**
         * @param {Array.<number>} input Input coordinate values.
         * @param {Array.<number>=} opt_output Output array of coordinates.
         * @param {number=} opt_dimension Dimension.
         * @return {Array.<number>} Output coordinate values.
         */
        function(input, opt_output, opt_dimension) {
      var length = input.length,
          dimension = opt_dimension > 1 ? opt_dimension : 2,
          output = opt_output;
      if (!goog.isDef(output)) {
        if (dimension > 2) {
          // preserve values beyond second dimension
          output = input.slice();
        } else {
          output = new Array(length);
        }
      }
      goog.asserts.assert(output.length % dimension === 0);
      var proj4jsPoint;
      for (var i = 0; i < length; i += dimension) {
        proj4jsPoint = new Proj4js.Point(input[i], input[i + 1]);
        proj4jsPoint = Proj4js.transform(
            sourceProj4jsProj, destinationProj4jsProj, proj4jsPoint);
        output[i] = proj4jsPoint.x;
        output[i + 1] = proj4jsPoint.y;
      }
      return output;
    };
    ol.proj.addTransform(sourceProjection, destinationProjection, transform);
  }
  if (!goog.isDef(transform)) {
    goog.asserts.assert(goog.isDef(transform));
    transform = ol.proj.identityTransform;
  }
  return transform;
};


/**
 * @param {Array.<number>} input Input coordinate array.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension.
 * @return {Array.<number>} Input coordinate array (same array as input).
 */
ol.proj.identityTransform = function(input, opt_output, opt_dimension) {
  if (goog.isDef(opt_output) && input !== opt_output) {
    // TODO: consider making this a warning instead
    goog.asserts.fail('This should not be used internally.');
    for (var i = 0, ii = input.length; i < ii; ++i) {
      opt_output[i] = input[i];
    }
    input = opt_output;
  }
  return input;
};


/**
 * @param {Array.<number>} input Input coordinate array.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension.
 * @return {Array.<number>} Output coordinate array (new array, same coordinate
 *     values).
 */
ol.proj.cloneTransform = function(input, opt_output, opt_dimension) {
  var output;
  if (goog.isDef(opt_output)) {
    for (var i = 0, ii = input.length; i < ii; ++i) {
      opt_output[i] = input[i];
    }
    output = opt_output;
  } else {
    output = input.slice();
  }
  return output;
};


/**
 * @param {ol.Coordinate} point Point.
 * @param {ol.ProjectionLike} source Source.
 * @param {ol.ProjectionLike} destination Destination.
 * @return {ol.Coordinate} Point.
 */
ol.proj.transform = function(point, source, destination) {
  var transformFn = ol.proj.getTransform(source, destination);
  return transformFn(point);
};


/**
 * Transforms the given point to the destination projection.
 *
 * @param {ol.Coordinate} point Point.
 * @param {ol.Projection} sourceProjection Source projection.
 * @param {ol.Projection} destinationProjection Destination projection.
 * @return {ol.Coordinate} Point.
 */
ol.proj.transformWithProjections =
    function(point, sourceProjection, destinationProjection) {
  var transformFn = ol.proj.getTransformFromProjections(
      sourceProjection, destinationProjection);
  return transformFn(point);
};


/**
 * @param {ol.Proj4jsProjectionOptions} options Proj4js projection options.
 * @return {ol.Projection} Proj4js projection.
 */
ol.proj.configureProj4jsProjection = function(options) {
  goog.asserts.assert(!goog.object.containsKey(
      ol.proj.proj4jsProjections_, options.code));
  return ol.proj.getProj4jsProjectionFromCode_(options);
};
