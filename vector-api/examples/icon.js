var raster = new ol.layer.Tile({
  source: new ol.source.TileJSON({
    url: 'http://api.tiles.mapbox.com/v3/mapbox.geography-class.jsonp'
  })
});

var styleArray = [new ol.style.Style({
  image: new ol.style.Icon({
    src: 'data/icon.png'
  })
})];

var vector = new ol.layer.Vector({
  source: new ol.source.GeoJSON(/** @type {olx.source.GeoJSONOptions} */ ({
    object: {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'properties': {
          'name': 'Null Island',
          'population': 4000,
          'rainfall': 500
        },
        'geometry': {
          'type': 'Point',
          'coordinates': [0, 0]
        }
      }]
    }
  })),
  styleFunction: function(feature, resolution) {
    return styleArray;
  }
});

var map = new ol.Map({
  layers: [raster, vector],
  renderer: ol.RendererHint.CANVAS,
  target: document.getElementById('map'),
  view: new ol.View2D({
    center: [0, 0],
    zoom: 3
  })
});

var element = document.getElementById('popup');

var popup = new ol.Overlay({
  element: element,
  positioning: ol.OverlayPositioning.BOTTOM_CENTER,
  stopEvent: false
});
map.addOverlay(popup);

// display popup on click
map.on('singleclick', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.getPixel(),
      function(feature, layer) {
        return feature;
      });
  if (feature) {
    var geometry = feature.getGeometry();
    var coord = geometry.getCoordinates();
    popup.setPosition(coord);
    $(element).popover({
      'placement': 'top',
      'html': true,
      'content': feature.get('name')
    });
    $(element).popover('show');
  } else {
    $(element).popover('destroy');
  }
});

// change mouse cursor when over marker
$(map.getViewport()).on('mousemove', function(e) {
  var pixel = map.getEventPixel(e.originalEvent);
  var hit = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
    return true;
  });
  if (hit) {
    map.getTarget().style.cursor = 'pointer';
  } else {
    map.getTarget().style.cursor = '';
  }
});
