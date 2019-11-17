/*let itinerary = [];
let coords = []; //technically could get coords from itinerary but i'm too lazy for that
const key = 'pk.eyJ1Ijoia2V2aW5zdW5kYXIiLCJhIjoiY2lmNjF6aGdmMDM1MDdzbHVpcThyZjF4YyJ9.1NKie7hjfYG3dNPYLhRizA';
*/



function push_waypoint(feature){
    itinerary.push(feature.properties.name ? feature.properties.name : feature.properties.bldgName);
    console.log(itinerary);
    itinerary[itinerary.length - 1] = itinerary.length + ". " + itinerary[itinerary.length - 1];
    coords.push(feature.geometry.coordinates);
    push_checkList(itinerary[itinerary.length - 1]);
}