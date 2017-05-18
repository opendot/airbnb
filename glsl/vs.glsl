
attribute vec3 step_0;
attribute vec3 step_1;
attribute vec3 step_2;
attribute vec3 step_3;
attribute vec3 step_4;
attribute vec3 step_5;

attribute vec3 color_0;
attribute vec3 color_1;
attribute vec3 color_2;
attribute vec3 color_3;
attribute vec3 color_4;
attribute vec3 color_5;

uniform float time;
uniform int step_in;
uniform int step_out;

varying vec3 col;
void main(){
    vec3 pos = position;
    pos = step_0;
    col = color_0;

    vec3 src, tar;
    vec3 srcCol, tarCol;

    //source buffer

    if( step_in == 0 ){
        src = step_0;
        srcCol = color_0;
    }
    if( step_in == 1 ){
        src = step_1;
        srcCol = color_1;
    }
    if( step_in == 2 ){
        src = step_2;
        srcCol = color_2;
    }
    if( step_in == 3 ){
        src = step_3;
        srcCol = color_3;
    }
    if( step_in == 4 ){
        src = step_4;
        srcCol = color_4;
    }
    if( step_in == 5 ){
        src = step_5;
        srcCol = color_5;
    }

    //target

    if( step_out == 0 ){
        tar = step_0;
        tarCol = color_0;
    }
    if( step_out == 1 ){
        tar = step_1;
        tarCol = color_1;
    }
    if( step_out == 2 ){
        tar = step_2;
        tarCol = color_2;
    }
    if( step_out == 3 ){
        tar = step_3;
        tarCol = color_3;
    }
    if( step_out == 4 ){
        tar = step_4;
        tarCol = color_4;
    }
    if( step_out == 5 ){
        tar = step_5;
        tarCol = color_5;
    }

    pos = mix( src, tar, time );
    col = mix( srcCol, tarCol, time );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1. );
}
