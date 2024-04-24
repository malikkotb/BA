<svg>
  <polyline />
  <path />
</svg>

// body {
//     background: #222;
//   }
  
//   svg {
//     position: absolute;
//     width: 100%;
//     height: 100%;
//   }
  
//   polyline {
//     fill: none;
//     stroke: #888;
//     stroke-width: 1;
//   }
  
//   path {
//     fill: none;
//     stroke: cornflowerblue;
//     stroke-width: 2;
//   }


var tension = 1;

var poly = document.querySelector("polyline");
var path = document.querySelector("path");

var points = [
  100,350,  
  200,100,
  300,350,
  400,150,
  500,350,
  600,200,
  700,350
];

poly.setAttribute("points", points);
path.setAttribute("d", solve(points, tension));

function solve(data, k) {

  if (k == null) k = 1;
  
  var size = data.length;
  var last = size - 4;    

  var path = "M" + [data[0], data[1]];

  for (var i = 0; i < size - 2; i +=2) {

    var x0 = i ? data[i - 2] : data[0];
    var y0 = i ? data[i - 1] : data[1];

    var x1 = data[i + 0];
    var y1 = data[i + 1];

    var x2 = data[i + 2];
    var y2 = data[i + 3];

    var x3 = i !== last ? data[i + 4] : x2;
    var y3 = i !== last ? data[i + 5] : y2;
    
    var cp1x = x1 + (x2 - x0) / 6 * k;
    var cp1y = y1 + (y2 - y0) / 6 * k;

    var cp2x = x2 - (x3 - x1) / 6 * k;
    var cp2y = y2 - (y3 - y1) / 6 * k;
   
    path += "C" + [cp1x, cp1y, cp2x, cp2y, x2, y2];
  } 

  return path;
}