goog.provide('ol.renderer.dom.Map');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.style');
goog.require('ol.Coordinate');
goog.require('ol.FrameState');
goog.require('ol.layer.TileLayer');
goog.require('ol.renderer.Map');
goog.require('ol.renderer.dom.TileLayer');



/**
 * @constructor
 * @extends {ol.renderer.Map}
 * @param {Element} container Container.
 * @param {ol.Map} map Map.
 */
ol.renderer.dom.Map = function(container, map) {

  goog.base(this, container, map);

  /**
   * @type {!Element}
   * @private
   */
  this.layersPane_ = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'ol-layers-pane ol-unselectable',
    height: '100%',
    width: '100%'
  });
  this.layersPane_.style.position = 'absolute';
  goog.dom.insertChildAt(container, this.layersPane_, 0);

  /**
   * @private
   * @type {boolean}
   */
  this.renderedVisible_ = true;

};
goog.inherits(ol.renderer.dom.Map, ol.renderer.Map);


/**
 * @inheritDoc
 */
ol.renderer.dom.Map.prototype.addLayer = function(layer) {
  goog.base(this, 'addLayer', layer);
  this.getMap().render();
};


/**
 * @inheritDoc
 */
ol.renderer.dom.Map.prototype.createLayerRenderer = function(layer) {
  if (layer instanceof ol.layer.TileLayer) {
    var layerRenderer = new ol.renderer.dom.TileLayer(this, layer);
    goog.dom.appendChild(this.layersPane_, layerRenderer.getTarget());
    return layerRenderer;
  } else {
    goog.asserts.assert(false);
    return null;
  }
};


/**
 * @inheritDoc
 */
ol.renderer.dom.Map.prototype.renderFrame = function(frameState) {

  if (goog.isNull(frameState)) {
    if (this.renderedVisible_) {
      goog.style.showElement(this.layersPane_, false);
      this.renderedVisible_ = false;
    }
    return;
  }

  goog.array.forEach(frameState.layersArray, function(layer) {
    var layerState = frameState.layerStates[goog.getUid(layer)];
    if (!layerState.ready) {
      return;
    }
    var layerRenderer = this.getLayerRenderer(layer);
    layerRenderer.renderFrame(frameState, layerState);
  }, this);

  if (!this.renderedVisible_) {
    goog.style.showElement(this.layersPane_, true);
    this.renderedVisible_ = true;
  }

  this.calculateMatrices2D(frameState);

};
