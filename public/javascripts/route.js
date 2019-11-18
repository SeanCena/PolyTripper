function push_waypoint(feature){
    itinerary.push(feature.properties.name ? feature.properties.name : feature.properties.bldgName);
    console.log(itinerary);
    itinerary[itinerary.length - 1] = itinerary.length + ". " + itinerary[itinerary.length - 1];
    coords.push(feature.geometry.coordinates);
    push_checkList(itinerary[itinerary.length - 1]);
}