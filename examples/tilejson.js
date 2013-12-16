goog.require('ol.Map');
goog.require('ol.RendererHint');
goog.require('ol.View2D');
goog.require('ol.layer.Tile');
goog.require('ol.source.TileJSON');


var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.TileJSON({
        url: 'http://api.tiles.mapbox.com/v3/examples.map-zr0njcqy.jsonp',
        crossOrigin: 'anonymous'
      })
    })
  ],
  renderer: ol.RendererHint.CANVAS,
  target: 'map',
  view: new ol.View2D({
    center: [0, 0],
    zoom: 2
  })
});
