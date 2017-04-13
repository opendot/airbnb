
$('document').ready(function(){

  var q = d3.queue();

  q.defer(d3.json, 'data/all_20160331.json')
    .defer(d3.json, 'data/all_20160420.json')
    .defer(d3.json, 'data/all_20160530.json')
    .defer(d3.json, 'data/all_20160805.json')
    .defer(d3.json, 'data/all_20161022.json')
    .defer(d3.json, 'data/all_20170207.json')
    .awaitAll(function(error, files) {


      if (error) throw error;
      console.log(files[0]);
      // var cose = []
      // files.forEach(function(d,i){
      //   console.log(d)
      //   var bbox = turf.bbox(d);
      //     bbox = turf.bboxPolygon(bbox)
      //   var area = turf.area(bbox)
      //
      //     cose.push({area:area, id:i})
      // })
      //
      // var ciao = d3.min(cose,function(d){
      //   return d.area
      // })
      //
      // console.log(ciao, cose)
      //
      // return

      var fileDict = [
        'March 2016',
        'April 2016',
        'May 2016',
        'August 2016',
        'February 2017',
      ]

      // introduction w/ all points
      var center = turf.centroid(files[0]);
      mapboxgl.accessToken = 'pk.eyJ1IjoidGVvIiwiYSI6IllvZUo1LUkifQ.dirqtn275pAKdnqtLM2HSw';
      var mapAll = new mapboxgl.Map({
          container: 'map-all',
          style: 'mapbox://styles/mapbox/light-v9',
          center: center.geometry.coordinates,
          minZoom:8,
          maxZoom:17,
          zoom: 13
      });

      var bbox = turf.bbox(files[0]);

        mapAll.fitBounds([[
              bbox[0],
              bbox[1]
          ], [
              bbox[2],
              bbox[3]
          ]],{padding:50});

      mapAll.on('load', function(){
        mapAll.addSource("rents", {
          "type": "geojson",
          "data": files[0]
      })

      mapAll.addLayer({
          "id": "rents",
          "type": "circle",
          "source": "rents",
          "paint": {
              "circle-radius": 2,
              "circle-color":'#FF5A5F'
          }
        });
      })

      d3.select('#intro .buttons').selectAll('div')
        .data(fileDict)
        .enter()
        .append('div')
        .attr('class', 'btn btn-default')
        .classed('active', function(d,i){
          if(!i){
            return true
          }
        })
        .text(function(d,i){
          return d
        })
        .on('click', function(d,i){
          d3.selectAll('#intro .btn').classed('active', false)
          d3.select(this).classed('active', true)
          setData(mapAll, 'rents', files[i])
        })

      $('#type input[type=checkbox]').on('change', function () {
        $(this).is(':checked');
        setFilter(mapAll, 'rents', 'type')
      });
      // end introduction

    });

    function setData(map, layer, data){
      map.getSource(layer).setData(data)
    }

    function setFilter(map, layer, prop, value){
      map.setFilter(layer,[
        'all',
        // ['in', 'type'],
        ['==', prop, 'entire_home']
        ]);
    }

})
