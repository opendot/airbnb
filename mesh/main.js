
if(!config) console.error("Config not set! Make a copy of 'config_template.js', add in your access token, and save the file as 'config.js'.");

mapboxgl.accessToken = config.accessToken;

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: [9.23, 45.4922653 ],
    zoom: 13,
    pitch: 60,
    heading: 41,
    hash: true
});

map.on("load", function() {


    // Initialize threebox
    window.threebox = new Threebox(map);
    threebox.setupDefaultLights();

    fileLoader.load( [
        "glsl/vs.glsl",
        "glsl/fs.glsl",
        "nolo/nolo.json",
        "nolo/idw_20160331_threebox.json",
        "nolo/idw_20160420_threebox.json",
        "nolo/idw_20160530_threebox.json",
        "nolo/idw_20160805_threebox.json",
        "nolo/idw_20161022_threebox.json",
        "nolo/idw_20170207_threebox.json"
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
        coord.push( item.geometry.coordinates[0], item.geometry.coordinates[1], 10 + value * 500 );

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

    //buttons
    var btns = document.getElementsByTagName("button");
    for( var i = 0; i < btns.length; i++ ){
        var btn = btns[i];
        btn.addEventListener("mousedown", onClick );
    }


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
        coord.push( 10 + value * 500 );

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


function onClick(e){

    if( tweening )return;
    tweening = true;

    mat.uniforms.step_in.value = mat.uniforms.step_out.value;
    mat.uniforms.step_out.value = parseInt( e.target.getAttribute( "value" ) );

    mat.uniforms.time.value = 0;

    TweenLite.to(  mat.uniforms.time, 1, {value:1, onComplete:function(){

        tweening = false;

    }} );

}
var mesh, geom, mat, startTime, stepId = 1, tweening = false;
