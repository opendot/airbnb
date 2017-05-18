
$('document').ready(function(){

  var q = d3.queue();

  q.defer(d3.json, 'data/all_20160331.json')
    .defer(d3.json, 'data/all_20160420.json')
    .defer(d3.json, 'data/all_20160530.json')
    .defer(d3.json, 'data/all_20160805.json')
    .defer(d3.json, 'data/all_20161022.json')
    .defer(d3.json, 'data/all_20170207.json')
    .defer(d3.json, 'data/nolo.json')
    .awaitAll(function(error, files) {


      if (error) throw error;

      var fileDict = [
        'March 2016',
        'April 2016',
        'May 2016',
        'August 2016',
        'February 2017',
      ]

      var nolo = files[files.length-1];

      files.pop()

      // introduction w/ all points
      var center = turf.centroid(files[0]);
      mapboxgl.accessToken = 'pk.eyJ1IjoidGVvIiwiYSI6IllvZUo1LUkifQ.dirqtn275pAKdnqtLM2HSw';
      var mapAll = new mapboxgl.Map({
          container: 'map-all',
          style: 'mapbox://styles/mapbox/light-v9',
          center: center.geometry.coordinates,
          minZoom:11,
          maxZoom:17,
          zoom: 13,
          scrollZoom: false
      });

      mapAll.addControl(new mapboxgl.NavigationControl(),'top-right');

      var bbox = turf.bbox(files[0]);

        mapAll.fitBounds([[
              bbox[0],
              bbox[1]
          ], [
              bbox[2],
              bbox[3]
          ]],{padding:100, offset:[150,0]});

      mapAll.on('load', function(){

        mapAll.addSource("nolo", {
          "type": "geojson",
          "data": nolo
      })

      mapAll.addLayer({
          "id": "nolo",
          "type": "line",
          "source": "nolo",
          "paint": {
              "line-color": "black",
              "line-width":1,
              "line-dasharray":[3,3]
          }
        });

        mapAll.addSource("rents", {
          "type": "geojson",
          "data": files[0]
      })

      mapAll.addLayer({
          "id": "rents",
          "type": "circle",
          "source": "rents",
          "paint": {
              "circle-radius": 3,
              "circle-stroke-width":1,
              "circle-stroke-color":"#fff",
              "circle-color":{
                type: 'categorical',
                property: 'type',
                stops: [
                    ['entire_home', '#513A50'],
                    ['private_room', '#FF5A5F'],
                    ['shared_room', '#FAB347']
                ]
              }
            }
        });


      })

      d3.select('#all .buttons').selectAll('div')
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
          d3.selectAll('#all .btn').classed('active', false)
          d3.select(this).classed('active', true)
          setData(mapAll, 'rents', files[i])
        })

        mapAll.on('click', 'rents', function (e) {

          var html = "<p>type: <strong>"  + e.features[0].properties.type.replace('_', ' ') + "</strong></p>"
                     + "<p>beds: <strong>" + e.features[0].properties.beds + "</strong></p>"
                     + "<p>price: <strong>" +  + e.features[0].properties.price + "€</strong></p>"

          new mapboxgl.Popup()
              .setLngLat(e.features[0].geometry.coordinates)
              .setHTML(html)
              .addTo(mapAll);
        });

        mapAll.on('mouseenter', 'rents', function () {
            mapAll.getCanvas().style.cursor = 'pointer';
        });

        mapAll.on('mouseleave', 'rents', function () {
            mapAll.getCanvas().style.cursor = '';
        });

      // end introduction

      // start idw

      var mapIdw = new mapboxgl.Map({
          container: 'map-idw',
          style: 'mapbox://styles/mapbox/light-v9',
          center: center.geometry.coordinates,
          minZoom:8,
          maxZoom:17,
          zoom: 13,
          pitch:45,
          scrollZoom: false
      });

      mapIdw.addControl(new mapboxgl.NavigationControl(),'top-right');

      mapIdw.fitBounds([[
            bbox[0],
            bbox[1]
        ], [
            bbox[2],
            bbox[3]
        ]],{padding:100, offset:[160,0]});

      var entireHome = [];

      files[0].features.forEach(function(d){
        if(d.properties.type == 'entire_home'){
          entireHome.push(d)
        }
      })

      entireHome = turf.featureCollection(entireHome)

      entireHome.features.forEach(function(d){
        if(d.properties.beds){
          d.properties.price = d.properties.price/d.properties.beds;
        }
      })

      var grid = turf.squareGrid(turf.bbox(entireHome), 0.05);

      grid.features.forEach(function(d){
        var center = turf.centroid(d);
        var isInside = turf.inside(center, nolo.features[0]);
        d.properties.keep = isInside?true:false;
      })

      grid.features = grid.features.filter(function(d){
        return d.properties.keep;
      })

      var output = turf.idw(entireHome, 'price', 0.25, 0.05);

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

      mapIdw.on('load', function(){


          mapIdw.addSource("nolo", {
            "type": "geojson",
            "data": nolo
        })

        mapIdw.addSource("grid", {
          "type": "geojson",
          "data": grid
        })

        mapIdw.addSource("all", {
          "type": "geojson",
          "data": files[0]
        })


          mapIdw.addSource("idw", {
            "type": "geojson",
            "data": output
          })


        mapIdw.addLayer({
            "id": "nolo",
            "type": "line",
            "source": "nolo",
            "layout":{
              "visibility":"none"
            },
            "paint": {
                "line-color": "black",
                "line-width":1,
                "line-dasharray":[3,3]
            }
          });

          mapIdw.addLayer({
              "id": "grid",
              "type": "line",
              "source": "grid",
              "layout":{
                "visibility":"none"
              }
            });

          mapIdw.addLayer({
              "id": "all",
              "type": "circle",
              "source": "all",
              "layout":{
                "visibility":"none"
              },
              "paint":{
                "circle-color": "#FF5A5F",
                "circle-radius": 3,
                "circle-stroke-width":1,
                "circle-opacity": 0.7,
                "circle-stroke-color":"#fff"
              }
            });


          mapIdw.addLayer({
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

      d3.select("#idwAll").on('click', function(){
        idwAll()
      })

      d3.select("#idwHome").on('click', function(){
        idwHome()
      })

      d3.select("#idwSize").on('click', function(){
        idwSize()
      })

      d3.select("#idwGrid").on('click', function(){
        idwGrid()
      })

      d3.select("#idwFlat").on('click', function(){
        idwFlat()
      })

      d3.select("#idwFinal").on('click', function(){
        idwFinal()
      })

      d3.select("#idwHospital").on('click', function(){
        idwHospital()
      })

      function idwAll(){
        mapIdw.easeTo({pitch:0})
        mapIdw.setLayoutProperty('nolo', 'visibility', 'visible');
        mapIdw.getSource('all').setData(files[0])
        mapIdw.setLayoutProperty('all', 'visibility', 'visible');

        mapIdw.setPaintProperty('all', 'circle-radius', 3);
        mapIdw.setPaintProperty('all', 'circle-color', '#F20000');

        mapIdw.setLayoutProperty('grid', 'visibility', 'none');
        mapIdw.setLayoutProperty('idw', 'visibility', 'none');
      }

      function idwHome(){
        mapIdw.easeTo({pitch:0})
        mapIdw.setLayoutProperty('nolo', 'visibility', 'visible');
        mapIdw.getSource('all').setData(entireHome)
        mapIdw.setLayoutProperty('all', 'visibility', 'visible');

        mapIdw.setPaintProperty('all', 'circle-radius', 3);
        mapIdw.setPaintProperty('all', 'circle-color', '#F20000');

        mapIdw.setLayoutProperty('grid', 'visibility', 'none');
        mapIdw.setLayoutProperty('idw', 'visibility', 'none');
      }

      function idwSize(){
        mapIdw.easeTo({pitch:0})
        mapIdw.setLayoutProperty('nolo', 'visibility', 'visible');
        mapIdw.getSource('all').setData(entireHome)
        mapIdw.setLayoutProperty('all', 'visibility', 'visible');


        var radius = {
          property: 'price',
          type: 'exponential',
          stops: [
              [d3.min(entireHome.features, function(d){return d.properties.price}), 3],
              [d3.max(entireHome.features, function(d){return d.properties.price}), 20]
          ]
        }

        var color = {
          property: 'price',
          type: 'exponential',
          stops: [
              [d3.min(entireHome.features, function(d){return d.properties.price}), '#F2FF55'],
              [d3.max(entireHome.features, function(d){return d.properties.price}), '#F20000']
          ]
        }

        mapIdw.setPaintProperty('all', 'circle-radius', radius);
        mapIdw.setPaintProperty('all', 'circle-color', color);

        mapIdw.setLayoutProperty('grid', 'visibility', 'none');
        mapIdw.setLayoutProperty('idw', 'visibility', 'none');
      }

      function idwGrid(){
        mapIdw.easeTo({pitch:0})
        mapIdw.setLayoutProperty('grid', 'visibility', 'visible');
        mapIdw.getSource('all').setData(entireHome)
        mapIdw.setLayoutProperty('all', 'visibility', 'visible');


        var color = {
          property: 'price',
          type: 'exponential',
          stops: [
              [d3.min(entireHome.features, function(d){return d.properties.price}), '#F2FF55'],
              [d3.max(entireHome.features, function(d){return d.properties.price}), '#F20000']
          ]
        }

        mapIdw.setPaintProperty('all', 'circle-radius', 3);
        mapIdw.setPaintProperty('all', 'circle-color', color);

        mapIdw.setLayoutProperty('nolo', 'visibility', 'none');
        mapIdw.setLayoutProperty('idw', 'visibility', 'none');
      }

      function idwFlat(){
        mapIdw.easeTo({pitch:0})
        mapIdw.setPaintProperty('idw', 'fill-extrusion-height', 0);


        mapIdw.setLayoutProperty('idw', 'visibility', 'visible');

        mapIdw.setLayoutProperty('nolo', 'visibility', 'none');
        mapIdw.setLayoutProperty('all', 'visibility', 'none');
        mapIdw.setLayoutProperty('grid', 'visibility', 'none');

      }

      function idwFinal(){
        mapIdw.easeTo({pitch:45})
        mapIdw.setPaintProperty('idw', 'fill-extrusion-height', { "type": "identity", "property": "height"});
        mapIdw.setLayoutProperty('idw', 'visibility', 'visible');
        mapIdw.setLayoutProperty('nolo', 'visibility', 'none');
        mapIdw.setLayoutProperty('all', 'visibility', 'none');
        mapIdw.setLayoutProperty('grid', 'visibility', 'none');

      }

      function idwHospital(){
        mapIdw.easeTo({pitch:0, zoom:15, center: [9.2305837, 45.4997064], offset:[160,0]})
        mapIdw.setPaintProperty('idw', 'fill-extrusion-height', { "type": "identity", "property": "height"});
        mapIdw.setLayoutProperty('idw', 'visibility', 'visible');
        mapIdw.setLayoutProperty('nolo', 'visibility', 'none');
        mapIdw.setLayoutProperty('all', 'visibility', 'none');
        mapIdw.setLayoutProperty('grid', 'visibility', 'none');

      }

      // end idw

      // start mesh
      var mapMesh = new mapboxgl.Map({
          container: 'map-mesh',
          style: 'mapbox://styles/mapbox/light-v9',
          center: center.geometry.coordinates,
          minZoom:8,
          maxZoom:17,
          zoom: 13,
          pitch:45,
          scrollZoom: false
      });

      mapMesh.addControl(new mapboxgl.NavigationControl(),'top-right');

      mapMesh.fitBounds([[
            bbox[0],
            bbox[1]
        ], [
            bbox[2],
            bbox[3]
        ]],{padding:100, offset:[160,0]});

        d3.select('#mesh .buttons').selectAll('div')
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
            d3.selectAll('#mesh .btn').classed('active', false)
            d3.select(this).classed('active', true)
            onClick(i)
          })

      mapMesh.on("load", function() {


          // Initialize threebox
          window.threebox = new Threebox(mapMesh);
          threebox.setupDefaultLights();

          fileLoader.load( [
              "glsl/vs.glsl",
              "glsl/fs.glsl",
              "data/nolo.json",
              "data/idw_20160331_threebox.json",
              "data/idw_20160420_threebox.json",
              "data/idw_20160530_threebox.json",
              "data/idw_20160805_threebox.json",
              "data/idw_20161022_threebox.json",
              "data/idw_20170207_threebox.json"
          ], initMesh );

      });


      function initMesh(){

          var vertices = [];
          var colors = [];
          var coords = [];

          var steps = [
              fileLoader.idw_20160331_threebox,
              fileLoader.idw_20160420_threebox,
              fileLoader.idw_20160530_threebox,
              fileLoader.idw_20160805_threebox,
              fileLoader.idw_20161022_threebox,
              fileLoader.idw_20170207_threebox
          ];

          var json = JSON.parse( steps[0] );
          var obj = new THREE.Object3D();
          json.features.forEach( function( item ){

              var value = item.properties.height;

              var bits = item.properties.fill.replace( 'rgb(', '' ).replace(')', '').replace(' ', '').split( ',' );
              var r = parseFloat( bits[0] ) / 0xFF;
              var g = parseFloat( bits[1] ) / 0xFF;
              var b = parseFloat( bits[2] ) / 0xFF;
              colors.push( r,g,b );


              var coord = [];
              coord.push( item.geometry.coordinates[0], item.geometry.coordinates[1], 1 + value * 250 );

              // Add the model to the threebox scenegraph at a specific geographic coordinate
              threebox.addAtCoordinate( obj, coord, {scaleToLatitude: true, preScale: 2});

              //obj.position now contains the position in the 3D space
              vertices.push( obj.position.x, obj.position.y, obj.position.z );

              //for triangulation purpose
              coords.push( item.geometry.coordinates );

          } );

          var poly = getPolygonPoints(coords);
          var tris = cdt2d( coords );
          var indices = [];
          tris.forEach( function( t ){

              //center of the triangle
              var x = ( coords[ t[0] ][0] + coords[ t[1] ][0] + coords[ t[2] ][0] ) / 3;
              var y = ( coords[ t[0] ][1] + coords[ t[1] ][1] + coords[ t[2] ][1] ) / 3;

              //we keep the face only if it is contained inside the polygon
              if( contains( poly, x,y ) ){
                  indices.push( t[0],t[1],t[2]);
              }

          });

          geom = new THREE.BufferGeometry();

          geom.addAttribute( "position", new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );
          geom.addAttribute( "step_0", new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );
          geom.addAttribute( "color_0", new THREE.BufferAttribute( new Float32Array( colors ), 3 )  );

          geom.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 )  );

          steps.shift();
          steps.forEach( function(step){
              addStep( JSON.parse( step ) );
          });

          mat = new THREE.ShaderMaterial({
              uniforms:{
                  time : {type:"f", value:0},
                  step_in : {type:"i", value:0},
                  step_out : {type:"i", value:0}
              },
              vertexShader:fileLoader.vs,
              fragmentShader:fileLoader.fs,
              transparent:true,
              wireframe:true

          });
          mesh = new THREE.Mesh( geom, mat );
          threebox.world.add(mesh);


      }
      function addStep(json ){

          var vertices = [];
          var colors = [];
          var obj = new THREE.Object3D();
          json.features.forEach( function( item, i ){


              var bits = item.properties.fill.replace( 'rgb(', '' ).replace(')', '').replace(' ', '').split( ',' );
              var r = parseFloat( bits[0] ) / 0xFF;
              var g = parseFloat( bits[1] ) / 0xFF;
              var b = parseFloat( bits[2] ) / 0xFF;
              colors.push( r,g,b );

              var value = item.properties.height;
              var coord = [];
              coord.push( item.geometry.coordinates[0], item.geometry.coordinates[1] );
              coord.push( 1 + value * 250 );

              // Add the model to the threebox scenegraph at a specific geographic coordinate
              threebox.addAtCoordinate( obj, coord, {scaleToLatitude: true, preScale: 2});
              vertices.push( obj.position.x, obj.position.y, obj.position.z );

          } );

          geom.addAttribute( "step_"+stepId, new THREE.BufferAttribute( new Float32Array( vertices ), 3 )  );
          geom.addAttribute( "color_"+stepId, new THREE.BufferAttribute( new Float32Array( colors ), 3 )  );
          stepId++;

      }

      function getPolygonPoints(coords ){
          var json = JSON.parse( fileLoader.nolo );
          var tmp = [];
          json.features.forEach(function( item ){
              item.geometry.coordinates[0].forEach( function( p ){
                  tmp.push( p );
              });
          });
          return tmp;
      }

      function contains( poly, x, y )
      {
          var c = false,
              l = poly.length,
              j = l - 1;
          for( var i = -1; ++i < l; j = i)
          {
              (   ( poly[ i ][1] <= y && y < poly[ j ][1] )
              ||  ( poly[ j ][1] <= y && y < poly[ i ][1] ) )
              &&  ( x < ( poly[ j ][0] - poly[ i ][0] ) * ( y - poly[ i ][1] ) / ( poly[ j ][1] - poly[ i ][1] ) + poly[ i ][0] )
              &&  ( c = !c);
          }
          return c;
      }


      function onClick(value){

          if( tweening )return;
          tweening = true;

          mat.uniforms.step_in.value = mat.uniforms.step_out.value;
          mat.uniforms.step_out.value = parseInt( value );

          mat.uniforms.time.value = 0;

          TweenLite.to(  mat.uniforms.time, 1, {value:1, onComplete:function(){

              tweening = false;

          }} );

      }
      var mesh, geom, mat, startTime, stepId = 1, tweening = false;

      // end mesh

    });

    function setData(map, layer, data){
      map.getSource(layer).setData(data)
    }


})
