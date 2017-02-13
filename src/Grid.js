'use strict'

const PNG = require('pngjs').PNG,
    fs = require('fs'),
    Hexasphere = require('hexasphere.js');

function latLonToXY(width, height, lat,lon){

    const x = Math.floor(width/2.0 + (width/360.0)*lon);
    const y = Math.floor((height/2.0 + (height/180.0)*lat));

    return {x: x, y: y};
}

function xyToIdx(x,y, width){
    return (width * y + x) << 2;
}

function rnd(num){
    return Math.round(num * 100) / 100;
}

// use a smaller representation of the tiles
function compress(t) {
    return t;
}

function createGrid(map, p) {
    p = p || {};
    let radius = p.radius || 500;
    let divisions = p.divisions || 35;
    let width = p.width || .45; 
    let tiny = p.tiny != null ? p.tiny : false;


    const hexasphere = new Hexasphere(radius, divisions, width);

    const o = { src: map, tiles: [] };

    return new Promise((ok) => {
        if (map == null) {
            throw new Error('No map supplied');
        }

        fs.createReadStream(map)
        .pipe(new PNG({
            filterType: 4
        }))
        .on('parsed', function() {
            for (let i = 0; i< hexasphere.tiles.length; i++){
                let count = 0;
                for(let j = 0; j< hexasphere.tiles[i].boundary.length; j++){
                    let latLon = hexasphere.tiles[i].getLatLon(radius,j);
                    let xy = latLonToXY(this.width, this.height, latLon.lat, latLon.lon);
                    let idx = xyToIdx(xy.x, xy.y, this.width);
                    count += 255 - this.data[idx];
                }

                let latLon = hexasphere.tiles[i].getLatLon(radius);
                let xy = latLonToXY(this.width, this.height, latLon.lat, latLon.lon);
                let idx = xyToIdx(xy.x, xy.y, this.width);
                count += 255 - this.data[idx];

                let size = (count/(hexasphere.tiles[i].boundary.length + 1))/255;

                if (size > .1){
                    let tile = {lat: rnd(latLon.lat), lon: rnd(latLon.lon), b: [] };
                    let scale = size - Math.random() * .25;

                    for (let j = 0; j< hexasphere.tiles[i].boundary.length; j++){
                        let newPoint = hexasphere.tiles[i].boundary[j].segment(hexasphere.tiles[i].centerPoint, size);
                        tile.b.push({
                            x: rnd(newPoint.x),
                            y: rnd(newPoint.y),
                            z: rnd(newPoint.z)
                        });
                    }

                    o.tiles.push(tiny ? compress(tile) : tile);
                }
            }
            let json = null;
            if (tiny) {
                json = JSON.stringify(o);
            } else {
                json = JSON.stringify(o, null, 4);
            }

            ok(json);
        });
    });

}

module.exports = createGrid;

