    let itinerary = [];
    let coords = []; //technically could get coords from itinerary but i'm too lazy for that
    
    function debounce(wait, func, immediate) {
      var timeout;
      return function() {
        var context = this,
          args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }
    
    function setFeatureLink(feature) {
      var url = "/";
      if (!feature.properties.type) {
        url += ("buildings/" + feature.properties.id);
      } else if(feature.properties.type === "sections") {
        url += ("sections/" + feature.properties.classNumber);
      } else if(feature.properties.type === "classrooms") {
        url += ("classrooms/" + feature.properties.roomRef);
      }
      history.replaceState(null, null, url);
    }
    
    function getItemName(feature) {
      if (!feature.properties.type) {
        return feature.properties.ref_en;
      } else if(feature.properties.type === "sections") {
        return feature.properties.department.trim() + " " + feature.properties.courseNumber.trim() + "-" + feature.properties.sectionNumber.trim();
      } else if(feature.properties.type === "classrooms") {
        if(feature.properties.room.startsWith("0")) {
          feature.properties.room = feature.properties.room.substr(1);
        }
        return feature.properties.bldg + "-" + feature.properties.room;
      }
    }
    
    function getItemSubname(feature) {
      if (!feature.properties.type) {
        return feature.properties.name +  (feature.properties.alt_name ? ", " + feature.properties.alt_name.split(";").join(", ") : "");
      } else if(feature.properties.type === "sections") {
        return feature.properties.courseName.trim();
      } else if(feature.properties.type === "classrooms") {
        return feature.properties.bldgName;
      }
    }

    function getName(feature) {
      if (!feature.properties.type) {
        return feature.properties.ref_en + ": " + feature.properties.name;
      } else if(feature.properties.type === "sections") {
        return feature.properties.department.trim() + " " + feature.properties.courseNumber.trim() + "-" + feature.properties.sectionNumber.trim() + ": " + feature.properties.courseName.trim();
      } else if(feature.properties.type === "classrooms") {
        if(feature.properties.room.startsWith("0")) {
          feature.properties.room = feature.properties.room.substr(1);
        }
        return feature.properties.bldg + "-" + feature.properties.room;
      }
    }

    function getDescription(feature) {
      if (!feature.properties.type) {
        return "<b>" + getName(feature) + "</b></br>" +
          (feature.properties.alt_name ? "<b>Known as:</b> " + feature.properties.alt_name.split(";").join(" | ") : "")
      } else if(feature.properties.type === "sections") {
        if(feature.properties.room.startsWith("0")) {
          feature.properties.room = feature.properties.room.substr(1);
        }
        return "<b>" + getName(feature) + "</b></br>" +
          "Building: " + feature.properties.bldgName.trim() + "<br/>" +
          "Room: " + feature.properties.room.trim() + "<br/>" +
          "Time: " + feature.properties.time.trim();
      } else if(feature.properties.type === "classrooms") {
        if(feature.properties.room.startsWith("0")) {
          feature.properties.room = feature.properties.room.substr(1);
        }
        return "<b>" + getName(feature) + "</b></br>" +
               "Building: " + feature.properties.bldgName.trim() + "<br/>" +
               "Room: " + feature.properties.room.trim();
      }
    }

    var sections, buildings, classrooms;
    $.when(
      $.getJSON("/dataset/sections.json", function(data) {
        sections = data;
      }),
      $.getJSON("/dataset/buildings.json", function(data) {
        buildings = data;
      }),
      $.getJSON("/dataset/classrooms.json", function(data) {
        classrooms = data;
      })
    ).then(function() {

      //not mine lmao
      //shoutout to Kevin for putting his api key in index.html
      mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5zdW5kYXIiLCJhIjoiY2lmNjF6aGdmMDM1MDdzbHVpcThyZjF4YyJ9.1NKie7hjfYG3dNPYLhRizA';

      var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/kevinsundar/cjt68puf75bui1fr0tfx397hw',
        center: [-120.661090, 35.300559],
        pitch: 20,
        zoom: 15
      });

        //REROUTE FUNCTION
        function reroute(){
            s = "";
            for(i = 0; i < itinerary.length; i++){
                s += coords[i][0] + "," + coords[i][1] + ";";
            }
            s = s.slice(0, -1);
            var req = new XMLHttpRequest();
            req.responseType = 'json';
            req.open(
                'GET',
                "https://api.mapbox.com/directions/v5/mapbox/walking/" + s + "?geometries=geojson&access_token=" + mapboxgl.accessToken, 
                true
                );
            req.onload = function() {
                var data = req.response.routes[0];
                var route = data.geometry.coordinates;
                var geojson = {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: route
                    }
                };
                // if the route already exists on the map, reset it using setData
                
                if (map.getSource('route')) {
                    map.getSource('route').setData(geojson);
                } else { // otherwise, make a new request
                    map.addLayer({
                        id: 'route',
                        type: 'line',
                        source: {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: geojson
                                }
                            }
                        },
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#fe5855',
                            'line-width': 5,
                            'line-opacity': 0.75
                        }
                    });
                }
                
            };
            req.send();
        }
        //sdfsfsdsdf

      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
      
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }), "bottom-right");

      map.on('load', function() {
        
        var displayedMarkers = []
      
        var lastPopup = null;

        function showDescriptionPopup(feature) {
          push_waypoint(feature);
          reroute();
          setFeatureLink(feature);
          
          var coordinates = feature.geometry.coordinates;
          var description = getDescription(feature);
          
          if (lastPopup) {
            lastPopup.remove();
          }
          
          lastPopup = new mapboxgl.Popup({ offset: [0, -10], className: "animated fadeIn"})
            .setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
        }
       
        function displayFeatureMarker(feature) {
          var el = document.createElement('div');
          el.className = 'marker';
          el.style.backgroundImage = 'url(/images/marker.png)';
          el.style.height = "26px";
          el.style.width = "26px";
          //Add coords to coords list, building name to itinerary list
          //console.log(feature);
      
          el.addEventListener('click', function(e) {
              map.flyTo({ center: feature.geometry.coordinates });
              showDescriptionPopup(feature);
              e.stopPropagation();
          });
      
          displayedMarkers.push(new mapboxgl.Marker(el)
                                            .setLngLat(feature.geometry.coordinates)
                                            .addTo(map));
        }
        
        function clearMap() {
          displayedMarkers.forEach(function(marker){
            marker.remove();
          })
        }

        function displayFilteredMap(filtered) {
          
          // Update map bounds
          var bounds = new mapboxgl.LngLatBounds();
          
          filtered.sections.forEach(function(feature) {
            bounds.extend(feature.geometry.coordinates);
            displayFeatureMarker(feature);
          });
          
          filtered.buildings.forEach(function(feature) {
            bounds.extend(feature.geometry.coordinates);
            displayFeatureMarker(feature);
          });
          
          filtered.classrooms.forEach(function(feature) {
            bounds.extend(feature.geometry.coordinates);
            displayFeatureMarker(feature);
          });

          if (lastPopup) {
            lastPopup.remove();
          }
          map.fitBounds(bounds, { maxZoom: 17, padding: 100 });

          if (filtered.sections.length + filtered.buildings.length + filtered.classrooms.length === 1) {
            showDescriptionPopup(filtered.sections[0] || filtered.buildings[0] || filtered.classrooms[0]);
          }
        }

        var selectData = $.map(sections.features, function(obj, index) {
          return {
            type: "sections",
            name: getItemName(obj),
            subname: getItemSubname(obj),
            id: "sections-" + index
          }
        });

        selectData = selectData.concat($.map(buildings.features, function(obj, index) {
          return {
            type: "buildings",
            name: getItemName(obj),
            subname: getItemSubname(obj),
            id: "buildings-" + index
          }
        }))
        
        selectData = selectData.concat($.map(classrooms.features, function(obj, index) {
          return {
            type: "classrooms",
            name: getItemName(obj),
            subname: getItemSubname(obj),
            id: "classrooms-" + index
          }
        }))

        var selectize = $('#filter-input').selectize({
          options: selectData,
          optgroups: [
            { $order: 2, type: 'classrooms', name: 'Classrooms' },
            { $order: 1, type: 'buildings', name: 'Buildings' },
            { $order: 3, type: 'sections', name: 'Sections' }
          ],
          valueField: 'id',
          labelField: 'name',
          searchField: ['name','subname'],
          optgroupField: 'type',
          optgroupLabelField: 'name',
          optgroupValueField: 'type',
          lockOptgroupOrder: true,
          plugins: ["clear_button"],
          render: {
            optgroup_header: function(data, escape) {
              return '<div class="optgroup-header">' + escape(data.name) + '</div>';
            },
            item: function(item, escape) {
                return '<div class="option">' +
                    (item.name ? '<div class="name">' + escape(item.name) + '</div>' : '') +
                    (item.subname ? '<div class="subname"><small>' + escape(item.subname) + '</small></div>' : '') +
                '</div>';
            },
            option: function(item, escape) {
                return '<div class="option">' +
                    (item.name ? '<div class="name">' + escape(item.name) + '</div>' : '') +
                    (item.subname ? '<div class="subname"><small>' + escape(item.subname) + '</small></div>' : '') +
                '</div>';
            }
          },
          maxOptions: 30,
          onType: function(text) {
            
            if (lastPopup) {
              lastPopup.remove();
            }

            var filtered = {
              "buildings": [],
              "sections": [],
              "classrooms": []
            }
            
            clearMap();
            var results = this.currentResults.items.slice(0, this.settings.maxOptions);
            if(results.length) {
              results.forEach(function(item) {
                var type = item.id.split("-")[0];
                var index = parseInt(item.id.split("-")[1]);
                if (type === "buildings") {
                  filtered.buildings.push(buildings.features[index]);
                } else if (type === "sections") {
                  filtered.sections.push(sections.features[index]);
                } else if (type === "classrooms") {
                  filtered.classrooms.push(classrooms.features[index]);
                }
              });
              displayFilteredMap(filtered);
            }

          },
          onChange: function(id) {
    
            if(id) {

              $("#filter-input-selectized").prop('disabled', true);

              clearMap();
              if (lastPopup) {
                lastPopup.remove();
              }
              
              var filtered = {
                "buildings": [],
                "sections": [],
                "classrooms": []
              }

              var type = id.split("-")[0];
              var index = parseInt(id.split("-")[1]);
              if (type === "buildings") {
                filtered.buildings.push(buildings.features[index]);
              }
              else if (type === "sections") {
                filtered.sections.push(sections.features[index]);
              } else if (type === "classrooms") {
                filtered.classrooms.push(classrooms.features[index]);
              }

              displayFilteredMap(filtered)
            } else {
              
              $("#filter-input-selectized").prop('disabled', false);

              clearMap();
              if (lastPopup) {
                lastPopup.remove();
              }
              
              history.replaceState(null, null, "/");
            }
          }
        })[0].selectize;;
        
        var tokenizedPath = window.location.pathname.split("/");
        if(tokenizedPath.length >= 3) {

          var type = tokenizedPath[1];
          var id = tokenizedPath[2];
          
          if (type === "buildings") {
            selectize.setValue(type+"-"+buildings.features.map((f) => f.properties.id).indexOf(id), false);
          } else if (type === "sections") {
            selectize.setValue(type+"-"+sections.features.map((f) => f.properties.classNumber).indexOf(id), false);
          } else if (type === "classrooms") {
            selectize.setValue(type+"-"+classrooms.features.map((f) => f.properties.roomRef).indexOf(id), false);
          }
          
        } else {
          map.flyTo({
            // These options control the ending camera position: centered at
            // the target, at zoom level 9, and north up.
            center: [-120.661090, 35.300559],
            zoom: 16,

            // These options control the flight curve, making it move
            // slowly and zoom out almost completely before starting
            // to pan.
            speed: 0.2, // make the flying slow
            curve: 1, // change the speed at which it zooms out
          });
        }
        
      });

    });