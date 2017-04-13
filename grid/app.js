d3.json('data/nolo.json', function(nolo){
d3.json('data/all_20160331.json', function(data){
  var center = turf.centroid(data);

  mapboxgl.accessToken = 'pk.eyJ1IjoidGVvIiwiYSI6IllvZUo1LUkifQ.dirqtn275pAKdnqtLM2HSw';
  var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v9',
      center: center.geometry.coordinates,
      minZoom:8,
      maxZoom:17,
      zoom: 13
  });

  var output = turf.idw(data, 'price', 0.5, 0.05);

  var colorscale = d3.scaleLinear().range(['#F2FF55', '#F20000'])

  var domainColor = d3.extent(output.features, function(d){return d.properties.z})

  colorscale.domain(domainColor)

  output.features.forEach(function(d){
    d.properties.fill = colorscale(d.properties.z)
  })

  var heightScale = d3.scaleLinear().range([1, 500])

  var domainHeight = d3.extent(output.features, function(d){
    return d.properties.z;
  })
  heightScale.domain(domainHeight);

  output.features.forEach(function(d){
    d.properties.height = heightScale(d.properties.z)-domainHeight[0];
  })

  output.features.forEach(function(d){
    var center = turf.centroid(d);
    var isInside = turf.inside(center, nolo.features[0]);
    d.properties.keep = isInside?true:false;
  })

  output.features = output.features.filter(function(d){
    return d.properties.keep;
  })

  map.on('load', function(){
    map.addSource("idw", {
      "type": "geojson",
      "data": output
  })

  // map.addLayer({
  //     "id": "idw",
  //     "type": "fill",
  //     "source": "idw",
  //     "paint": {
  //         "fill-color": { "type": "identity", "property": "fill"}
  //     }
  //   });
  map.addLayer({
      "id": "idw",
      "type": "fill-extrusion",
      "source": "idw",
      "paint": {
          "fill-extrusion-color": { "type": "identity", "property": "fill"},
          "fill-extrusion-height": { "type": "identity", "property": "height"},
          "fill-extrusion-opacity": 0.6

      }
    });
  })


})
})
