goog.provide('ol.geom2.LineString');
goog.provide('ol.geom2.LineStringCollection');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');
goog.require('ol.geom2');
goog.require('ol.structs.Buffer');


/**
 * @typedef {Array.<Array.<number>>}
 */
ol.geom2.LineString;



/**
 * @constructor
 * @param {ol.structs.Buffer} buf Buffer.
 * @param {Object.<string, number>=} opt_ends Ends.
 * @param {number=} opt_dim Dimension.
 */
ol.geom2.LineStringCollection = function(buf, opt_ends, opt_dim) {

  /**
   * @type {ol.structs.Buffer}
   */
  this.buf = buf;

  /**
   * @type {Object.<string, number>}
   */
  this.ends = goog.isDef(opt_ends) ? opt_ends : {};

  /**
   * @type {number}
   */
  this.dim = goog.isDef(opt_dim) ? opt_dim : 2;

};


/**
 * @param {number} capacity Capacity.
 * @param {number=} opt_dim Dimension.
 * @return {ol.geom2.LineStringCollection} Line string collection.
 */
ol.geom2.LineStringCollection.createEmpty = function(capacity, opt_dim) {
  var dim = goog.isDef(opt_dim) ? opt_dim : 2;
  var buf = new ol.structs.Buffer(new Array(capacity * dim), 0);
  return new ol.geom2.LineStringCollection(buf, undefined, dim);
};


/**
 * @param {Array.<ol.geom2.LineString>} lineStrings Line strings.
 * @param {number=} opt_capacity Capacity.
 * @param {number=} opt_dim Dimension.
 * @return {ol.geom2.LineStringCollection} Line string collection.
 */
ol.geom2.LineStringCollection.pack =
    function(lineStrings, opt_capacity, opt_dim) {
  var i;
  var n = lineStrings.length;
  var dim = goog.isDef(opt_dim) ? opt_dim :
      n > 0 ? lineStrings[0][0].length : 2;
  var capacity;
  if (goog.isDef(opt_capacity)) {
    capacity = opt_capacity;
  } else {
    capacity = 0;
    for (i = 0; i < n; ++i) {
      capacity += lineStrings[i].length;
    }
  }
  capacity *= dim;
  var arr = new Array(capacity);
  /** @type {Object.<string, number>} */
  var ends = {};
  var offset = 0;
  var start;
  for (i = 0; i < n; ++i) {
    goog.asserts.assert(lineStrings[i].length > 1);
    start = offset;
    offset = ol.geom2.packPoints(arr, offset, lineStrings[i], dim);
    ends[start + ''] = offset;
  }
  goog.asserts.assert(offset <= capacity);
  var buf = new ol.structs.Buffer(arr, offset);
  return new ol.geom2.LineStringCollection(buf, ends, dim);
};


/**
 * @param {ol.geom2.LineString} lineString Line string.
 * @return {number} Offset.
 */
ol.geom2.LineStringCollection.prototype.add = function(lineString) {
  var n = lineString.length * this.dim;
  var offset = this.buf.allocate(n);
  goog.asserts.assert(offset != -1);
  this.ends[offset + ''] = offset + n;
  ol.geom2.packPoints(this.buf.getArray(), offset, lineString, this.dim);
  return offset;
};


/**
 * @param {number} offset Offset.
 * @return {ol.geom2.LineString} Line string.
 */
ol.geom2.LineStringCollection.prototype.get = function(offset) {
  goog.asserts.assert(offset in this.ends);
  var end = this.ends[offset + ''];
  return ol.geom2.unpackPoints(
      this.buf.getArray(), offset, end, this.dim);
};


/**
 * @return {number} Count.
 */
ol.geom2.LineStringCollection.prototype.getCount = function() {
  return goog.object.getCount(this.ends);
};


/**
 * @return {ol.Extent} Extent.
 */
ol.geom2.LineStringCollection.prototype.getExtent = function() {
  return ol.geom2.getExtent(this.buf, this.dim);
};


/**
 * @return {Uint16Array} Indices.
 */
ol.geom2.LineStringCollection.prototype.getIndices = function() {
  // FIXME cache and track dirty / track output length
  var dim = this.dim;
  var offsets = goog.array.map(goog.object.getKeys(this.ends), Number);
  goog.array.sort(offsets);
  var n = offsets.length;
  var indices = [];
  var i, j, end, offset, stop;
  for (i = 0; i < n; ++i) {
    offset = offsets[i];
    end = this.ends[offset];
    stop = end / dim - 1;
    for (j = offset / dim; j < stop; ++j) {
      indices.push(j, j + 1);
    }
  }
  return new Uint16Array(indices);
};


/**
 * @param {number} offset Offset.
 */
ol.geom2.LineStringCollection.prototype.remove = function(offset) {
  goog.asserts.assert(offset in this.ends);
  var end = this.ends[offset + ''];
  this.buf.remove(end - offset, offset);
  delete this.ends[offset + ''];
};


/**
 * @param {number} offset Offset.
 * @param {ol.geom2.LineString} lineString Line string.
 * @return {number} Offset.
 */
ol.geom2.LineStringCollection.prototype.set = function(offset, lineString) {
  var dim = this.dim;
  goog.asserts.assert(offset in this.ends);
  var end = this.ends[offset + ''];
  if (lineString.length * dim == end - offset) {
    ol.geom2.packPoints(this.buf.getArray(), offset, lineString, dim);
    this.buf.markDirty(end - offset, offset);
    return offset;
  } else {
    this.remove(offset);
    return this.add(lineString);
  }
};


/**
 * @return {Array.<ol.geom2.LineString>} Line strings.
 */
ol.geom2.LineStringCollection.prototype.unpack = function() {
  var dim = this.dim;
  var n = this.getCount();
  var lineStrings = new Array(n);
  var i = 0;
  var offset, end;
  for (offset in this.ends) {
    end = this.ends[offset];
    lineStrings[i++] = ol.geom2.unpackPoints(
        this.buf.getArray(), Number(offset), end, dim);
  }
  return lineStrings;
};
